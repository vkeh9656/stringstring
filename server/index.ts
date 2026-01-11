// Socket.io 서버 (별도 포트에서 실행)
// 실행: node server/index.js 또는 ts-node server/index.ts
import { Server } from 'socket.io';
import { createServer } from 'http';
import { ClientToServerEvents, ServerToClientEvents } from '../src/types/socket';
import { Room, User, GameState, TuneCoachData, LiarGameData, TelepathyData, CatchMindData } from '../src/types/game';
import { roomQueries, userQueries, gameStateQueries } from './db';

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*', // 모든 origin 허용 (개발/테스트용)
    methods: ['GET', 'POST'],
  },
});

// 방 관리 (확장된 Room 타입)
interface ExtendedRoom extends Room {
  selectedGame?: string;
  readyUsers: Set<string>;
  backToRoomUsers: Set<string>; // 대기실로 돌아온 사용자 추적
}

const rooms = new Map<string, ExtendedRoom>();
const users = new Map<string, { socketId: string; userId: string; nickname: string; roomId: string | null; isReady: boolean }>();

// 4자리 PIN 생성
const generateRoomId = (): string => {
  let pin = '';
  let attempts = 0;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
    attempts++;
    // DB에서도 확인
    if (attempts > 100) {
      throw new Error('방 ID 생성 실패: 너무 많은 시도');
    }
  } while (rooms.has(pin) || roomQueries.get(pin));
  return pin;
};

// 사용자 ID 생성
const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

io.on('connection', (socket) => {
  console.log('사용자 연결:', socket.id);

  // 방 생성
  socket.on('room:create', (data) => {
    try {
      const userId = generateUserId();
      const roomId = generateRoomId();
      
      const user: User = {
        userId,
        nickname: data.nickname,
        isPremium: false,
      };

      const room: ExtendedRoom = {
        roomId,
        hostId: userId,
        userList: [user],
        currentState: 'waiting',
        readyUsers: new Set(),
        backToRoomUsers: new Set(),
      };

      rooms.set(roomId, room);
      users.set(socket.id, { socketId: socket.id, userId, nickname: data.nickname, roomId, isReady: true });

      // DB에 저장
      roomQueries.create(roomId, userId);
      userQueries.upsert(socket.id, userId, data.nickname, roomId, true, true);

      socket.join(roomId);
      // room 정보도 함께 전송 (호스트도 참가자 목록에 표시되도록)
      socket.emit('room:created', { 
        roomId, 
        user,
        room: { ...room, readyUsers: Array.from(room.readyUsers) }
      });
      socket.emit('room:user-list', { 
        users: room.userList, 
        hostId: room.hostId,
        readyUsers: Array.from(room.readyUsers),
        currentState: room.currentState
      });
    } catch (error) {
      socket.emit('room:error', { message: '방 생성 실패' });
    }
  });

  // 방 참가
  socket.on('room:join', (data) => {
    try {
      const room = rooms.get(data.roomId);
      if (!room) {
        socket.emit('room:error', { message: '방을 찾을 수 없습니다' });
        return;
      }

      if (room.userList.length >= 8) {
        socket.emit('room:error', { message: '방이 가득 찼습니다' });
        return;
      }

      const userId = generateUserId();
      const user: User = {
        userId,
        nickname: data.nickname,
        isPremium: false,
      };

      room.userList.push(user);
      users.set(socket.id, { socketId: socket.id, userId, nickname: data.nickname, roomId: data.roomId, isReady: false });

      // DB에 저장
      userQueries.upsert(socket.id, userId, data.nickname, data.roomId, false, false);

      socket.join(data.roomId);
      socket.emit('room:joined', { room: { ...room, readyUsers: Array.from(room.readyUsers) }, user });
      io.to(data.roomId).emit('room:user-list', { 
        users: room.userList, 
        hostId: room.hostId,
        readyUsers: Array.from(room.readyUsers),
        currentState: room.currentState
      });
      
      // 현재 선택된 게임이 있으면 전송
      if (room.selectedGame) {
        socket.emit('room:game-selected', { gameType: room.selectedGame });
      }
    } catch (error) {
      socket.emit('room:error', { message: '방 참가 실패' });
    }
  });

  // 방 나가기
  socket.on('room:leave', () => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (room) {
      room.userList = room.userList.filter(u => u.userId !== userInfo.userId);
      room.readyUsers.delete(userInfo.userId);
      
      if (room.userList.length === 0) {
        rooms.delete(userInfo.roomId);
        // DB에서도 방 삭제
        roomQueries.delete(userInfo.roomId);
      } else if (room.hostId === userInfo.userId) {
        // 호스트가 나가면 다음 사용자를 호스트로 지정
        room.hostId = room.userList[0].userId;
        // DB 업데이트
        roomQueries.updateState(userInfo.roomId, room.currentState);
      }

      io.to(userInfo.roomId).emit('room:left', { userId: userInfo.userId });
      io.to(userInfo.roomId).emit('room:user-list', { 
        users: room.userList, 
        hostId: room.hostId,
        readyUsers: Array.from(room.readyUsers)
      });
    }

    // DB에서 사용자 삭제
    userQueries.delete(socket.id);
    users.delete(socket.id);
    socket.leave(userInfo.roomId);
  });

  // 준비 상태 변경
  socket.on('room:ready', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) {
      console.log('❌ [준비 상태 변경 실패] userInfo 또는 roomId 없음', { socketId: socket.id });
      return;
    }

    const room = rooms.get(userInfo.roomId);
    if (!room) {
      console.log('❌ [준비 상태 변경 실패] room 없음', { roomId: userInfo.roomId });
      return;
    }

    const previousReadyState = userInfo.isReady;
    userInfo.isReady = data.isReady;
    
    if (data.isReady) {
      room.readyUsers.add(userInfo.userId);
      
      // userId별 준비 상태 체크 로그
      const userIdStatusMap = room.userList.map(u => ({
        userId: u.userId,
        nickname: u.nickname,
        isReady: room.readyUsers.has(u.userId),
        isHost: u.userId === room.hostId
      }));
      
      console.log('✅ [준비 상태 ON]');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 [userId별 준비 상태 체크]:', userIdStatusMap);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log({
        roomId: userInfo.roomId,
        변경된_사용자: { userId: userInfo.userId, nickname: userInfo.nickname },
        이전상태: previousReadyState,
        현재상태: data.isReady,
        준비완료_사용자_ID_목록: Array.from(room.readyUsers),
        준비완료_수: room.readyUsers.size,
        전체_사용자_수: room.userList.length
      });
    } else {
      room.readyUsers.delete(userInfo.userId);
      
      // userId별 준비 상태 체크 로그
      const userIdStatusMap = room.userList.map(u => ({
        userId: u.userId,
        nickname: u.nickname,
        isReady: room.readyUsers.has(u.userId),
        isHost: u.userId === room.hostId
      }));
      
      console.log('⏸️ [준비 상태 OFF]');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 [userId별 준비 상태 체크]:', userIdStatusMap);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log({
        roomId: userInfo.roomId,
        변경된_사용자: { userId: userInfo.userId, nickname: userInfo.nickname },
        이전상태: previousReadyState,
        현재상태: data.isReady,
        준비완료_사용자_ID_목록: Array.from(room.readyUsers),
        준비완료_수: room.readyUsers.size,
        전체_사용자_수: room.userList.length
      });
    }

    // DB에 업데이트
    userQueries.updateReady(socket.id, data.isReady);

    // 준비 상태 업데이트 브로드캐스트
    io.to(userInfo.roomId).emit('room:ready-update', { 
      userId: userInfo.userId, 
      isReady: data.isReady 
    });
    
    // 모든 클라이언트에 최신 사용자 목록과 준비 상태 동기화 (게임 화면에서도 받을 수 있도록)
    io.to(userInfo.roomId).emit('room:user-list', { 
      users: room.userList, 
      hostId: room.hostId,
      readyUsers: Array.from(room.readyUsers),
      currentState: room.currentState
    });
  });

  // 게임 선택 (호스트만)
  socket.on('room:select-game', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.hostId !== userInfo.userId) return;

    room.selectedGame = data.gameType;
    (room as any).gameSettings = data.settings || {}; // 게임 설정 저장
    
    // DB에 저장
    roomQueries.updateSelectedGame(userInfo.roomId, data.gameType, data.settings);
    
    io.to(userInfo.roomId).emit('room:game-selected', { 
      gameType: data.gameType,
      settings: data.settings || {}
    });
  });

  // 방 정보 요청 (클라이언트가 페이지 로드 시 호출)
  socket.on('room:request-info', (data) => {
    // 먼저 메모리에서 확인
    let room = rooms.get(data.roomId);
    
    // 메모리에 없으면 DB에서 복구
    if (!room) {
      const dbRoom = roomQueries.get(data.roomId);
      if (!dbRoom) {
        socket.emit('room:error', { message: '방을 찾을 수 없습니다' });
        return;
      }
      
      // DB에서 방 정보 복구
      const dbUsers = userQueries.getByRoomId(data.roomId);
      const userList: User[] = dbUsers.map(u => ({
        userId: u.user_id,
        nickname: u.nickname,
        isPremium: false,
      }));
      
      room = {
        roomId: dbRoom.room_id,
        hostId: dbRoom.host_id,
        userList,
        currentState: dbRoom.current_state as GameState,
        readyUsers: new Set(dbUsers.filter(u => u.is_ready === 1).map(u => u.user_id)),
        backToRoomUsers: new Set(),
        selectedGame: dbRoom.selected_game || undefined,
      };
      
      if (dbRoom.game_settings) {
        try {
          (room as any).gameSettings = JSON.parse(dbRoom.game_settings);
        } catch (e) {
          console.error('게임 설정 파싱 실패:', e);
        }
      }
      
      // 메모리에 캐시
      rooms.set(data.roomId, room);
      
      // 게임 상태도 복구
      const gameState = gameStateQueries.get(data.roomId);
      if (gameState) {
        room.gameType = gameState.gameType as any;
        room.gameData = gameState.gameData;
      }
    }

    // 재연결 시 사용자 복구 (userId가 제공된 경우)
    if (data.userId) {
      const existingUser = room.userList.find(u => u.userId === data.userId);
      if (existingUser) {
        // 이미 같은 socket.id로 매핑되어 있으면 복구 스킵
        const currentUserInfo = users.get(socket.id);
        if (!(currentUserInfo && currentUserInfo.userId === data.userId)) {
          // 사용자가 방에 있지만 현재 socket.id에 매핑되지 않은 경우
          const oldUserInfo = Array.from(users.values()).find(u => u.userId === data.userId && u.roomId === data.roomId);
          if (oldUserInfo && oldUserInfo.socketId !== socket.id) {
            // 기존 매핑 제거
            users.delete(oldUserInfo.socketId);
          }
          
          // 새로운 socket.id로 매핑
          const isReady = room.readyUsers.has(existingUser.userId);
          users.set(socket.id, {
            socketId: socket.id,
            userId: existingUser.userId,
            nickname: existingUser.nickname,
            roomId: data.roomId,
            isReady,
          });
          
          // DB에도 업데이트
          userQueries.upsert(socket.id, existingUser.userId, existingUser.nickname, data.roomId, isReady, room.hostId === existingUser.userId);
          
          // 방에 다시 join
          socket.join(data.roomId);
          
          console.log('재연결 사용자 복구:', existingUser.nickname, socket.id);
        }
      }
    }

    // 현재 방 정보 전송 (준비 상태 및 현재 상태 포함)
    socket.emit('room:user-list', { 
      users: room.userList, 
      hostId: room.hostId,
      readyUsers: Array.from(room.readyUsers),
      currentState: room.currentState
    });
    
    // 선택된 게임이 있으면 전송
    if (room.selectedGame) {
      socket.emit('room:game-selected', { 
        gameType: room.selectedGame,
        settings: (room as any).gameSettings || {}
      });
    }
    
    // 게임이 진행 중이면 게임 상태도 전송 (타이머 동기화 포함)
    if (room.currentState === 'playing' && room.gameData) {
      // CatchMind 게임인 경우 남은 시간 계산해서 전송
      if (room.gameType === 'catch-mind') {
        const gameData = room.gameData as CatchMindData;
        const elapsed = (Date.now() - gameData.startTime) / 1000;
        const timeLeft = Math.max(0, Math.ceil(gameData.timeLimit - elapsed));
        
        // 게임 데이터에 남은 시간 추가
        const syncedGameData = {
          ...gameData,
          timeLeft: timeLeft,
        };
        
        socket.emit('game:started', { gameType: room.gameType || '', gameData: syncedGameData });
        
        // 현재 턴 정보를 다시 전송 (재연결 시 동기화)
        const userInfo = users.get(socket.id);
        if (userInfo) {
          const isDrawer = userInfo.userId === gameData.drawerId;
          const drawerUser = room.userList.find(u => u.userId === gameData.drawerId);
          
          socket.emit('catchmind:next-turn', {
            drawerId: gameData.drawerId,
            drawerNickname: drawerUser?.nickname || '',
            word: isDrawer ? gameData.word : null,
            round: gameData.round,
            timeLeft: timeLeft, // 남은 시간 포함
            correctUsers: gameData.correctUsers, // 이미 맞춘 사람들 정보 포함
          });
        }
      } else {
        socket.emit('game:started', { gameType: room.gameType || '', gameData: room.gameData });
      }
    }
    
    // 준비 상태 전송
    room.readyUsers.forEach((userId) => {
      socket.emit('room:ready-update', { userId, isReady: true });
    });
  });

  // 강제퇴장 (호스트만)
  socket.on('room:kick', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.hostId !== userInfo.userId) {
      socket.emit('room:error', { message: '호스트만 퇴장시킬 수 있습니다' });
      return;
    }

    // 대상 찾기
    let targetSocketId: string | null = null;
    users.forEach((user, socketId) => {
      if (user.userId === data.targetUserId && user.roomId === userInfo.roomId) {
        targetSocketId = socketId;
      }
    });

    if (targetSocketId) {
      // 대상 유저 정보 삭제
      const targetUser = users.get(targetSocketId);
      if (targetUser) {
        room.userList = room.userList.filter(u => u.userId !== data.targetUserId);
        room.readyUsers.delete(data.targetUserId);
        users.delete(targetSocketId);

        // 대상에게 퇴장 알림
        io.to(targetSocketId).emit('room:kicked', { userId: data.targetUserId });
        
        // 방 전체에 유저 목록 갱신
        io.to(userInfo.roomId).emit('room:user-list', { 
        users: room.userList, 
        hostId: room.hostId,
        readyUsers: Array.from(room.readyUsers)
      });
      }
    }
  });

  // 카운트다운 시작 (호스트가 게임 시작 버튼을 누를 때)
  socket.on('game:countdown-start', (callback?: (response: { success?: boolean; error?: string }) => void) => {
    console.log('카운트다운 시작 요청 수신:', socket.id);
    try {
      const userInfo = users.get(socket.id);
      if (!userInfo || !userInfo.roomId) {
        console.log('userInfo 또는 roomId 없음', { userInfo: !!userInfo, roomId: userInfo?.roomId });
        if (callback) callback({ error: 'userInfo 또는 roomId 없음' });
        return;
      }

      const room = rooms.get(userInfo.roomId);
      if (!room) {
        console.log('room 없음', { roomId: userInfo.roomId });
        if (callback) callback({ error: 'room 없음' });
        return;
      }
      
      if (room.hostId !== userInfo.userId) {
        console.log('호스트가 아님', { hostId: room.hostId, userId: userInfo.userId });
        socket.emit('room:error', { message: '호스트만 게임을 시작할 수 있습니다' });
        if (callback) callback({ error: '호스트가 아님' });
        return;
      }

      // 서버에서 모든 참가자의 준비 상태 확인 (각 방마다 독립적으로 관리)
      const otherUsers = room.userList.filter(u => u.userId !== userInfo.userId);
      const allReady = otherUsers.length === 0 || otherUsers.every(u => room.readyUsers.has(u.userId));
      
      // userId별 준비 상태 체크
      const userIdStatusMap = room.userList.map(u => ({
        userId: u.userId,
        nickname: u.nickname,
        isReady: room.readyUsers.has(u.userId),
        isHost: u.userId === room.hostId,
        상태: room.readyUsers.has(u.userId) ? '✅ 준비완료' : '❌ 준비안됨'
      }));
      
      console.log('🔍 [게임 시작 준비 상태 확인]');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 [userId별 준비 상태 체크]:', userIdStatusMap);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log({
        roomId: userInfo.roomId,
        호스트: { userId: userInfo.userId, nickname: userInfo.nickname },
        준비완료_사용자_ID_목록: Array.from(room.readyUsers),
        준비안된_사용자_ID_목록: otherUsers
          .filter(u => !room.readyUsers.has(u.userId))
          .map(u => u.userId),
        준비완료_수: room.readyUsers.size,
        전체_참가자_수: otherUsers.length,
        모든_준비완료: allReady ? '✅ YES' : '❌ NO'
      });
      
      if (!allReady) {
        const notReadyUsers = otherUsers.filter(u => !room.readyUsers.has(u.userId));
        
        // userId별 준비 상태 체크 (실패 시)
        const userIdStatusMap = room.userList.map(u => ({
          userId: u.userId,
          nickname: u.nickname,
          isReady: room.readyUsers.has(u.userId),
          isHost: u.userId === room.hostId,
          상태: room.readyUsers.has(u.userId) ? '✅ 준비완료' : '❌ 준비안됨'
        }));
        
        console.log('❌ [게임 시작 실패] 모든 참가자가 준비되지 않음');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 [userId별 준비 상태 체크]:', userIdStatusMap);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log({
          roomId: userInfo.roomId,
          준비안된_사용자_상세: notReadyUsers.map(u => ({ userId: u.userId, nickname: u.nickname })),
          준비완료_사용자_ID_목록: Array.from(room.readyUsers),
          전체_사용자_ID_목록: room.userList.map(u => u.userId)
        });
        socket.emit('room:error', { message: '모든 참가자가 준비를 완료해야 게임을 시작할 수 있습니다!' });
        if (callback) callback({ error: '모든 참가자가 준비되지 않음' });
        return;
      }

      // userId별 준비 상태 체크 (승인 시)
      const userIdStatusMapApproved = room.userList.map(u => ({
        userId: u.userId,
        nickname: u.nickname,
        isReady: room.readyUsers.has(u.userId),
        isHost: u.userId === room.hostId,
        상태: room.readyUsers.has(u.userId) ? '✅ 준비완료' : '❌ 준비안됨'
      }));
      
      console.log('🚀 [게임 시작 승인] 카운트다운 시작 브로드캐스트');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 [userId별 준비 상태 체크]:', userIdStatusMapApproved);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log({
        roomId: userInfo.roomId,
        참가자_수: room.userList.length,
        준비완료_사용자_ID_목록: Array.from(room.readyUsers),
        준비완료_수: room.readyUsers.size
      });
      // 모든 클라이언트에 카운트다운 시작 브로드캐스트
      io.to(userInfo.roomId).emit('countdown:start');
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('카운트다운 시작 처리 중 에러:', error);
      if (callback) callback({ error: error.message });
    }
  });

  // 게임 시작 (카운트다운 완료 후 호출)
  socket.on('game:start', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.hostId !== userInfo.userId) {
      socket.emit('room:error', { message: '호스트만 게임을 시작할 수 있습니다' });
      return;
    }

    // 게임 시작 시 모든 사용자의 준비 상태 초기화
    const beforeClearReadyUsers = Array.from(room.readyUsers);
    
    // 초기화 전 userId별 준비 상태 체크
    const beforeStatusMap = room.userList.map(u => ({
      userId: u.userId,
      nickname: u.nickname,
      isReady: room.readyUsers.has(u.userId),
      isHost: u.userId === room.hostId,
      상태: room.readyUsers.has(u.userId) ? '✅ 준비완료' : '❌ 준비안됨'
    }));
    
    room.readyUsers.clear();
    // 게임 시작 시 대기실 복귀 추적 초기화
    room.backToRoomUsers.clear();
    users.forEach((user) => {
      if (user.roomId === userInfo.roomId) {
        user.isReady = false;
        userQueries.updateReady(user.socketId, false);
      }
    });
    
    // 초기화 후 userId별 준비 상태 체크
    const afterStatusMap = room.userList.map(u => ({
      userId: u.userId,
      nickname: u.nickname,
      isReady: false, // 모두 초기화됨
      isHost: u.userId === room.hostId,
      상태: '🔄 초기화됨'
    }));
    
    console.log('🔄 [게임 시작 - 준비 상태 초기화]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 [초기화 전 userId별 준비 상태]:', beforeStatusMap);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 [초기화 후 userId별 준비 상태]:', afterStatusMap);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log({
      roomId: userInfo.roomId,
      게임타입: data.gameType,
      초기화_전_준비완료_사용자_ID: beforeClearReadyUsers,
      초기화_후_준비완료_사용자_ID: Array.from(room.readyUsers)
    });
    
    // 모든 클라이언트에 준비 상태 초기화 알림
    io.to(userInfo.roomId).emit('room:ready-reset');

    room.currentState = 'playing';
    room.gameType = data.gameType as any;

    // 게임 타입에 따라 초기 데이터 설정
    if (data.gameType === 'tune-coach') {
      // 카운트다운이 대기방에서 완료된 후 호출되므로 즉시 startTime 설정
      const gameData: TuneCoachData = {
        targetTime: data.settings?.targetTime || 5.0,
        startTime: Date.now(), // 카운트다운 완료 후 즉시 설정
        playerResults: [],
        blindTime: 2000 + Math.random() * 1000, // 2-3초 사이
      };
      room.gameData = gameData;
      room.currentState = 'playing';
      room.gameType = data.gameType;
      
      // DB에 저장
      roomQueries.updateState(userInfo.roomId, 'playing');
      gameStateQueries.upsert(userInfo.roomId, data.gameType, gameData);
      
      // 게임 시작 알림 (startTime 포함)
      io.to(userInfo.roomId).emit('tune-coach:started', {
        startTime: gameData.startTime,
        targetTime: gameData.targetTime,
        blindTime: gameData.blindTime,
      });
      
      io.to(userInfo.roomId).emit('game:started', {
        gameType: data.gameType,
        gameData: gameData,
      });
      return;
    } else if (data.gameType === 'liar-game') {
      const gameData: LiarGameData = {
        topic: data.settings?.topic || '음식',
        word: data.settings?.word || '피자',
        roles: {},
        explanations: {},
        votes: {},
        round: 1,
      };
      
      // 역할 배정 (1명은 라이어)
      const liarIndex = Math.floor(Math.random() * room.userList.length);
      room.userList.forEach((user, index) => {
        gameData.roles[user.userId] = index === liarIndex ? 'liar' : 'citizen';
      });

      room.gameData = gameData;
      room.currentState = 'playing';
      room.gameType = data.gameType;
      
      // DB에 저장
      roomQueries.updateState(userInfo.roomId, 'playing');
      gameStateQueries.upsert(userInfo.roomId, data.gameType, gameData);
      
      // 각 사용자에게 개별적으로 game:started와 함께 역할 전달
      users.forEach((user, socketId) => {
        if (user.roomId === userInfo.roomId) {
          const role = gameData.roles[user.userId];
          // 라이어에게는 단어를 보내지 않음 (게임의 핵심 규칙)
          io.to(socketId).emit('game:started', { 
            gameType: data.gameType, 
            gameData: {
              ...gameData,
              myRole: role,
              myWord: role === 'liar' ? null : gameData.word, // 라이어는 단어 모름
            }
          });
        }
      });
      return; // 아래 공통 game:started emit을 건너뜀
    } else if (data.gameType === 'telepathy') {
      const gameData: TelepathyData = {
        question: data.settings?.question || '당신의 선택은?',
        optionA: data.settings?.optionA || 'A',
        optionB: data.settings?.optionB || 'B',
        playerChoices: {},
        timeLimit: 5,
        startTime: Date.now(),
      };
      room.gameData = gameData;
      room.currentState = 'playing';
      room.gameType = data.gameType;
      
      // DB에 저장
      roomQueries.updateState(userInfo.roomId, 'playing');
      gameStateQueries.upsert(userInfo.roomId, data.gameType, gameData);
      
      io.to(userInfo.roomId).emit('telepathy:started', {
        question: gameData.question,
        optionA: gameData.optionA,
        optionB: gameData.optionB,
        timeLimit: gameData.timeLimit,
      });
    } else if (data.gameType === 'catch-mind') {
      // 캐치마인드 단어 목록 (모든 단어 합치기)
      const ALL_WORDS = [
        // 동물
        '강아지', '고양이', '코끼리', '기린', '사자', '호랑이', '펭귄', '돌고래', '토끼', '원숭이',
        '곰', '뱀', '거북이', '독수리', '앵무새', '오리', '돼지', '소', '말', '양', '사슴', '코뿔소',
        // 음식
        '피자', '치킨', '햄버거', '라면', '김밥', '떡볶이', '초밥', '파스타', '아이스크림', '케이크',
        '빵', '샌드위치', '감자튀김', '비빔밥', '삼겹살', '사과', '바나나', '수박', '포도', '딸기',
        // 물건
        '자동차', '비행기', '자전거', '컴퓨터', '휴대폰', '텔레비전', '냉장고', '의자', '책상', '침대',
        '우산', '가방', '신발', '안경', '시계', '카메라', '피아노', '기타', '축구공', '연필', '가위',
        // 직업
        '의사', '경찰', '소방관', '선생님', '요리사', '가수', '배우', '화가', '운동선수', '우주비행사',
        // 장소/건물
        '학교', '병원', '공원', '해변', '산', '도서관', '영화관', '놀이공원', '동물원', '집', '아파트',
        // 기타
        '태양', '달', '별', '무지개', '눈사람', '크리스마스트리', '하트', '선물', '풍선', '로봇',
      ];
      
      const randomWord = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
      const maxRounds = Math.min(room.userList.length, data.settings?.rounds || 2);
      
      // 초기 점수 설정
      const scores: { [userId: string]: number } = {};
      room.userList.forEach(user => {
        scores[user.userId] = 0;
      });
      
      const gameData: CatchMindData = {
        word: randomWord,
        drawerId: room.userList[0].userId,
        drawerIndex: 0,
        round: 1,
        maxRounds,
        timeLimit: data.settings?.timeLimit || 60,
        startTime: Date.now(),
        scores,
        correctUsers: [],
        topic: 'random',
      };
      
      room.gameData = gameData;
      room.currentState = 'playing';
      room.gameType = data.gameType;
      
      // DB에 저장
      roomQueries.updateState(userInfo.roomId, 'playing');
      gameStateQueries.upsert(userInfo.roomId, data.gameType, gameData);
      
      console.log('CatchMind 시작:', {
        drawerId: gameData.drawerId,
        word: gameData.word,
        userList: room.userList.map(u => ({ oderId: u.userId, nickname: u.nickname })),
      });
      
      // 각 사용자에게 개별 전송 (출제자에게만 단어 전달)
      users.forEach((user, socketId) => {
        if (user.roomId === userInfo.roomId) {
          const isDrawer = user.userId === gameData.drawerId;
          console.log(`전송 to ${user.nickname}: isDrawer=${isDrawer}, oderId=${user.userId}, drawerId=${gameData.drawerId}`);
          
          // 남은 시간 계산 (서버 시간 기준)
          const elapsed = (Date.now() - gameData.startTime) / 1000;
          const timeLeft = Math.max(0, Math.ceil(gameData.timeLimit - elapsed));
          
          io.to(socketId).emit('catchmind:started', {
            drawerId: gameData.drawerId,
            drawerNickname: room.userList[0].nickname,
            word: isDrawer ? gameData.word : null,
            timeLimit: gameData.timeLimit,
            timeLeft: timeLeft, // 남은 시간 추가
            round: gameData.round,
            maxRounds: gameData.maxRounds,
            scores: gameData.scores,
          });
        }
      });
      
      // game:started 이벤트도 보내서 화면 전환
      io.to(userInfo.roomId).emit('game:started', { gameType: data.gameType, gameData: room.gameData });
      return;
    }

    io.to(userInfo.roomId).emit('game:started', { gameType: data.gameType, gameData: room.gameData });
  });

  // Tune Coach: 정지
  socket.on('tune-coach:stop', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.gameType !== 'tune-coach') return;

    const gameData = room.gameData as TuneCoachData;
    if (!gameData.startTime) return;

    const stopTime = (data.timestamp - gameData.startTime) / 1000; // 초 단위
    const error = Math.abs(stopTime - gameData.targetTime);

    const result = {
      userId: userInfo.userId,
      nickname: userInfo.nickname,
      stopTime: data.timestamp,
      error,
      rank: null,
    };

    gameData.playerResults.push(result);
    
    io.to(userInfo.roomId).emit('tune-coach:stopped', {
      userId: userInfo.userId,
      stopTime: data.timestamp,
    });

    // 모든 플레이어가 정지했는지 확인
    if (gameData.playerResults.length === room.userList.length) {
      // 순위 계산
      gameData.playerResults.sort((a, b) => a.error - b.error);
      gameData.playerResults.forEach((r, index) => {
        r.rank = index + 1;
      });

      io.to(userInfo.roomId).emit('tune-coach:results', { results: gameData.playerResults });
      room.currentState = 'result';
    }
  });

  // Liar Game: 설명
  socket.on('liar-game:explain', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.gameType !== 'liar-game') return;

    const gameData = room.gameData as LiarGameData;
    gameData.explanations[userInfo.userId] = data.explanation;

    io.to(userInfo.roomId).emit('liar-game:explained', {
      userId: userInfo.userId,
      explanation: data.explanation,
    });
  });

  // Liar Game: 투표
  socket.on('liar-game:vote', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.gameType !== 'liar-game') return;

    const gameData = room.gameData as LiarGameData;
    gameData.votes[userInfo.userId] = data.targetUserId;

    io.to(userInfo.roomId).emit('liar-game:voted', {
      userId: userInfo.userId,
      targetUserId: data.targetUserId,
    });

    // 모든 플레이어가 투표했는지 확인
    if (Object.keys(gameData.votes).length === room.userList.length) {
      // 가장 많이 투표받은 사람 찾기
      const voteCount: { [key: string]: number } = {};
      Object.values(gameData.votes).forEach((targetId) => {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1;
      });

      const maxVotes = Math.max(...Object.values(voteCount));
      const liar = Object.keys(gameData.roles).find(
        (userId) => gameData.roles[userId] === 'liar'
      );

      io.to(userInfo.roomId).emit('liar-game:results', {
        votes: gameData.votes,
        liar: liar || '',
      });
      room.currentState = 'result';
    }
  });

  // Telepathy: 선택
  socket.on('telepathy:choose', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.gameType !== 'telepathy') return;

    const gameData = room.gameData as TelepathyData;
    gameData.playerChoices[userInfo.userId] = data.choice;

    io.to(userInfo.roomId).emit('telepathy:chosen', {
      userId: userInfo.userId,
      choice: data.choice,
    });

    // 모든 플레이어가 선택했는지 확인
    if (Object.keys(gameData.playerChoices).length === room.userList.length) {
      const choices = Object.values(gameData.playerChoices);
      const allSame = choices.every((choice) => choice === choices[0]);
      const traitor = allSame
        ? undefined
        : room.userList.find(
            (user) => gameData.playerChoices[user.userId] !== choices[0]
          )?.userId;

      io.to(userInfo.roomId).emit('telepathy:results', {
        success: allSame,
        choices: gameData.playerChoices,
        traitor,
      });
      room.currentState = 'result';
    }
  });

  // Catch Mind: 그림 그리기
  socket.on('catchmind:draw', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.gameType !== 'catch-mind') return;

    const gameData = room.gameData as CatchMindData;
    
    // 출제자만 그릴 수 있음
    if (userInfo.userId !== gameData.drawerId) return;

    // 다른 사람들에게 그림 전송 (출제자 제외)
    socket.to(userInfo.roomId).emit('catchmind:draw', { drawData: data.drawData });
  });

  // Catch Mind: 캔버스 지우기
  socket.on('catchmind:clear', () => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.gameType !== 'catch-mind') return;

    const gameData = room.gameData as CatchMindData;
    
    // 출제자만 지울 수 있음
    if (userInfo.userId !== gameData.drawerId) return;

    socket.to(userInfo.roomId).emit('catchmind:clear');
  });

  // Catch Mind: 정답 추측
  socket.on('catchmind:guess', (data) => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.gameType !== 'catch-mind') return;

    const gameData = room.gameData as CatchMindData;
    
    // 출제자는 추측 불가
    if (userInfo.userId === gameData.drawerId) return;
    
    // 이미 맞춘 사람은 추측 불가
    if (gameData.correctUsers.includes(userInfo.userId)) return;

    // 채팅 메시지 브로드캐스트 (모든 추측을 다른 사람들에게 보여줌)
    io.to(userInfo.roomId).emit('catchmind:chat', {
      oderId: userInfo.userId,
      nickname: userInfo.nickname,
      message: data.guess.trim(),
    });

    // 정답 체크 (대소문자, 공백 무시)
    const guess = data.guess.trim().toLowerCase().replace(/\s/g, '');
    const answer = gameData.word.toLowerCase().replace(/\s/g, '');
    
    if (guess === answer) {
      // 정답!
      gameData.correctUsers.push(userInfo.userId);
      
      // 점수 계산: 1분(60초) 안에 맞추면 100점, 초과하면 70점
      const elapsedTime = (Date.now() - gameData.startTime) / 1000;
      const score = elapsedTime <= 60 ? 100 : 70;
      
      gameData.scores[userInfo.userId] = (gameData.scores[userInfo.userId] || 0) + score;
      // 출제자도 +30점
      gameData.scores[gameData.drawerId] = (gameData.scores[gameData.drawerId] || 0) + 30;
      
      // DB에 업데이트 저장
      gameStateQueries.upsert(userInfo.roomId, room.gameType!, gameData);
      
      io.to(userInfo.roomId).emit('catchmind:correct', {
        oderId: userInfo.userId,
        guessernickname: userInfo.nickname,
        answer: gameData.word,
        scores: gameData.scores,
        scoreGained: score, // 획득한 점수 표시용
      });
      
      // 모두 맞췄으면 다음 턴
      if (gameData.correctUsers.length >= room.userList.length - 1) {
        setTimeout(() => nextCatchMindTurn(userInfo.roomId), 3000); // 3초 후 다음 턴
      }
    }
  });

  // Catch Mind: 포기 (출제자가 포기)
  socket.on('catchmind:skip', () => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room || room.gameType !== 'catch-mind') return;

    const gameData = room.gameData as CatchMindData;
    
    // 출제자만 포기 가능
    if (userInfo.userId !== gameData.drawerId) return;

    // 정답 공개 후 다음 턴
    io.to(userInfo.roomId).emit('catchmind:skipped', {
      answer: gameData.word,
      drawerNickname: userInfo.nickname,
    });
    
    setTimeout(() => nextCatchMindTurn(userInfo.roomId), 3000); // 3초 후 다음 턴
  });

  // 캐치마인드 다음 턴 함수
  function nextCatchMindTurn(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const gameData = room.gameData as CatchMindData;
    
    // 다음 출제자로
    gameData.drawerIndex++;
    
    // 모든 플레이어가 출제했으면 다음 라운드
    if (gameData.drawerIndex >= room.userList.length) {
      gameData.drawerIndex = 0;
      gameData.round++;
      
      // 최대 라운드 도달 시 게임 종료
      if (gameData.round > gameData.maxRounds) {
        // 우승자 찾기
        let maxScore = 0;
        let winner = '';
        Object.entries(gameData.scores).forEach(([oderId, score]) => {
          if (score > maxScore) {
            maxScore = score;
            winner = oderId;
          }
        });
        
        io.to(roomId).emit('catchmind:results', {
          scores: gameData.scores,
          winner,
        });
        room.currentState = 'result';
        return;
      }
    }
    
    // 새 단어 선택 (모든 단어에서 랜덤)
    const ALL_WORDS = [
      '강아지', '고양이', '코끼리', '기린', '사자', '호랑이', '펭귄', '돌고래', '토끼', '원숭이',
      '곰', '뱀', '거북이', '독수리', '앵무새', '오리', '돼지', '소', '말', '양', '사슴', '코뿔소',
      '피자', '치킨', '햄버거', '라면', '김밥', '떡볶이', '초밥', '파스타', '아이스크림', '케이크',
      '빵', '샌드위치', '감자튀김', '비빔밥', '삼겹살', '사과', '바나나', '수박', '포도', '딸기',
      '자동차', '비행기', '자전거', '컴퓨터', '휴대폰', '텔레비전', '냉장고', '의자', '책상', '침대',
      '우산', '가방', '신발', '안경', '시계', '카메라', '피아노', '기타', '축구공', '연필', '가위',
      '의사', '경찰', '소방관', '선생님', '요리사', '가수', '배우', '화가', '운동선수', '우주비행사',
      '학교', '병원', '공원', '해변', '산', '도서관', '영화관', '놀이공원', '동물원', '집', '아파트',
      '태양', '달', '별', '무지개', '눈사람', '크리스마스트리', '하트', '선물', '풍선', '로봇',
    ];
    
    gameData.word = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
    gameData.drawerId = room.userList[gameData.drawerIndex].userId;
    gameData.correctUsers = [];
    gameData.startTime = Date.now();
    
    // DB에 업데이트 저장
    gameStateQueries.upsert(roomId, room.gameType!, gameData);
    
    // 각 사용자에게 개별 전송
    users.forEach((user, socketId) => {
      if (user.roomId === roomId) {
        const isDrawer = user.userId === gameData.drawerId;
        
        // 남은 시간 계산 (서버 시간 기준)
        const elapsed = (Date.now() - gameData.startTime) / 1000;
        const timeLeft = Math.max(0, Math.ceil(gameData.timeLimit - elapsed));
        
        io.to(socketId).emit('catchmind:next-turn', {
          drawerId: gameData.drawerId,
          drawerNickname: room.userList[gameData.drawerIndex].nickname,
          word: isDrawer ? gameData.word : null,
          round: gameData.round,
          timeLeft: timeLeft, // 남은 시간 추가
          correctUsers: gameData.correctUsers, // 이미 맞춘 사람들 정보 (재연결 시 동기화용)
        });
      }
    });
  }

  // 대기실로 돌아가기 (개별적으로)
  socket.on('game:back-to-room', () => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room) return;

    // 게임이 진행 중일 때만 추적
    if (room.currentState === 'playing') {
      room.backToRoomUsers.add(userInfo.userId);
      
      // 모든 클라이언트가 대기실로 돌아왔는지 확인
      const allBackToRoom = room.userList.every(user => 
        room.backToRoomUsers.has(user.userId)
      );
      
      if (allBackToRoom) {
        // 모든 클라이언트가 대기실로 돌아왔으면 게임 선택 초기화 및 준비 버튼 활성화 알림
        room.selectedGame = undefined;
        (room as any).gameSettings = {};
        // DB에 업데이트
        roomQueries.updateSelectedGame(userInfo.roomId, null);
        // 클라이언트에 게임 선택 초기화 알림
        io.to(userInfo.roomId).emit('room:game-selected', { gameType: null as any });
        io.to(userInfo.roomId).emit('room:all-back-to-room');
      }
    }
  });

  // 게임 종료 (대기실로 돌아가기)
  socket.on('game:end', () => {
    const userInfo = users.get(socket.id);
    if (!userInfo || !userInfo.roomId) return;

    const room = rooms.get(userInfo.roomId);
    if (!room) return;

    // 게임 상태 초기화 (selectedGame은 유지하여 이전 게임 계속 표시)
    room.currentState = 'waiting';
    room.gameType = undefined;
    room.gameData = undefined;
    // room.selectedGame은 유지
    
    // DB에 업데이트
    roomQueries.updateState(userInfo.roomId, 'waiting');
    gameStateQueries.delete(userInfo.roomId);
    
    // 준비 상태 초기화
    const beforeClearReadyUsers = Array.from(room.readyUsers);
    room.readyUsers.clear();
    users.forEach((user) => {
      if (user.roomId === userInfo.roomId) {
        user.isReady = false;
        userQueries.updateReady(user.socketId, false);
      }
    });

    console.log('🔄 [게임 종료 - 준비 상태 초기화]', {
      roomId: userInfo.roomId,
      초기화_전_준비완료_사용자: beforeClearReadyUsers,
      초기화_후_준비완료_사용자: Array.from(room.readyUsers),
      전체_사용자: room.userList.map(u => ({ userId: u.userId, nickname: u.nickname }))
    });

    // 모든 사용자에게 게임 종료 및 사용자 목록 전송 (준비 상태 정보 포함)
    io.to(userInfo.roomId).emit('game:finished', { gameType: '', results: null });
    io.to(userInfo.roomId).emit('room:user-list', { 
      users: room.userList, 
      hostId: room.hostId,
      readyUsers: Array.from(room.readyUsers)
    });
    
    // 준비 상태 초기화 알림 (모든 참가자의 준비 상태 해제)
    io.to(userInfo.roomId).emit('room:ready-reset');
    
    // 선택된 게임이 있으면 다시 전송 (참가자 화면에 표시)
    if (room.selectedGame) {
      io.to(userInfo.roomId).emit('room:game-selected', { 
        gameType: room.selectedGame,
        settings: (room as any).gameSettings || {}
      });
    }
  });

  // 연결 해제 (재연결을 위해 일정 시간 동안 유지)
  socket.on('disconnect', () => {
    const userInfo = users.get(socket.id);
    if (userInfo && userInfo.roomId) {
      const room = rooms.get(userInfo.roomId);
      if (room) {
        // 재연결을 위해 30초 동안 사용자 정보 유지
        const userId = userInfo.userId;
        const timeoutId = setTimeout(() => {
          // 30초 후에도 재연결되지 않으면 제거
          const stillDisconnected = !Array.from(users.values()).some(u => u.userId === userId && u.roomId === room.roomId);
          if (stillDisconnected && room.userList.some(u => u.userId === userId)) {
            room.userList = room.userList.filter(u => u.userId !== userId);
            room.readyUsers.delete(userId);
            
            if (room.userList.length === 0) {
              rooms.delete(userInfo.roomId);
              // DB에서도 방 삭제
              roomQueries.delete(userInfo.roomId);
            } else if (room.hostId === userId) {
              room.hostId = room.userList[0].userId;
              // DB 업데이트
              roomQueries.updateState(userInfo.roomId, room.currentState);
            }

            io.to(userInfo.roomId).emit('room:left', { userId });
            io.to(userInfo.roomId).emit('room:user-list', { 
        users: room.userList, 
        hostId: room.hostId,
        readyUsers: Array.from(room.readyUsers)
      });
            console.log('사용자 최종 제거 (재연결 실패):', userId);
          }
        }, 30000); // 30초 대기

        // socket.id만 제거 (userId는 유지)
        users.delete(socket.id);
        console.log('사용자 연결 해제 (30초 대기):', socket.id, userId);
      } else {
        users.delete(socket.id);
      }
    } else {
      users.delete(socket.id);
      console.log('사용자 연결 해제:', socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // 모든 네트워크 인터페이스에서 리스닝 (외부 접속 허용)

httpServer.listen(Number(PORT), HOST, () => {
  console.log(`Socket.io 서버가 ${HOST}:${PORT}에서 실행 중입니다.`);
});


