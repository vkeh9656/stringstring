'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { User, Room, GameState } from '@/types/game';
import TuneCoach from '@/components/games/multi/TuneCoach';
import LiarGame from '@/components/games/multi/LiarGame';
import CatchMind from '@/components/games/multi/CatchMind';

// 게임 목록
const GAMES = [
  { id: 'tune-coach', name: '⏱️ 캐치 타임', description: '5초 맞추기', color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'liar-game', name: '🎭 라이어 게임', description: '라이어 찾기', color: 'bg-red-500 hover:bg-red-600' },
  { id: 'catch-mind', name: '🎨 캐치마인드', description: '그림 맞추기', color: 'bg-orange-500 hover:bg-orange-600' },
];

// 대기실 및 게임 룸 페이지
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [readyUsers, setReadyUsers] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);
  const [tuneCoachTime, setTuneCoachTime] = useState(5); // 5, 10, 15초
  const [countdown, setCountdown] = useState<number | null>(null); // 카운트다운 (3, 2, 1, null)
  const [gameFinished, setGameFinished] = useState(true); // 게임 종료 여부 (초기값 true: 아직 게임 시작 전)
  
  // 라이어 게임 설정
  const [liarTopic, setLiarTopic] = useState('음식');
  
  // 캐치마인드 설정
  const [catchMindRounds, setCatchMindRounds] = useState(2);
  
  // 주제별 단어 목록 (주제당 50개)
  const LIAR_WORDS: { [key: string]: string[] } = {
    '음식': [
      '피자', '치킨', '햄버거', '떡볶이', '김치찌개', '초밥', '파스타', '라면', '삼겹살', '비빔밥',
      '돈까스', '짜장면', '짬뽕', '칼국수', '냉면', '불고기', '갈비찜', '제육볶음', '오므라이스', '카레',
      '샌드위치', '타코', '스테이크', '샐러드', '수프', '감자튀김', '핫도그', '부리또', '쌀국수', '우동',
      '떡국', '만두', '김밥', '순두부찌개', '된장찌개', '부대찌개', '삼계탕', '감자탕', '설렁탕', '육개장',
      '족발', '보쌈', '닭갈비', '찜닭', '양념치킨', '후라이드치킨', '떡갈비', '곱창', '막창', '대창'
    ],
    '동물': [
      '강아지', '고양이', '코끼리', '기린', '사자', '호랑이', '펭귄', '돌고래', '토끼', '햄스터',
      '곰', '늑대', '여우', '원숭이', '침팬지', '고릴라', '판다', '코알라', '캥거루', '악어',
      '뱀', '거북이', '독수리', '앵무새', '올빼미', '까마귀', '참새', '비둘기', '오리', '닭',
      '돼지', '소', '말', '양', '염소', '사슴', '순록', '얼룩말', '하마', '코뿔소',
      '치타', '표범', '재규어', '퓨마', '스컹크', '너구리', '다람쥐', '청설모', '두더지', '고슴도치'
    ],
    '직업': [
      '의사', '소방관', '선생님', '요리사', '경찰관', '가수', '배우', '프로그래머', '변호사', '운동선수',
      '간호사', '약사', '수의사', '치과의사', '소아과의사', '판사', '검사', '회계사', '세무사', '건축가',
      '디자이너', '작가', '기자', '아나운서', 'PD', '감독', '사진작가', '화가', '조각가', '음악가',
      '파일럿', '승무원', '선장', '기관사', '택시기사', '버스기사', '우체부', '택배기사', '미용사', '바리스타',
      '제빵사', '정비사', '전기기사', '배관공', '목수', '농부', '어부', '광부', '군인', '외교관'
    ],
    '장소': [
      '학교', '병원', '놀이공원', '영화관', '도서관', '공원', '해변', '산', '카페', '마트',
      '백화점', '시장', '편의점', '약국', '은행', '우체국', '경찰서', '소방서', '구청', '법원',
      '박물관', '미술관', '수족관', '동물원', '식물원', '천문대', '과학관', '체육관', '수영장', '스키장',
      '골프장', '야구장', '축구장', '농구장', '테니스장', '볼링장', '당구장', '노래방', '피시방', '찜질방',
      '호텔', '펜션', '캠핑장', '공항', '항구', '기차역', '버스터미널', '주유소', '세차장', '놀이터'
    ],
    '물건': [
      '스마트폰', '노트북', '자동차', '냉장고', '에어컨', '텔레비전', '시계', '우산', '가방', '신발',
      '안경', '선글라스', '모자', '장갑', '목도리', '벨트', '지갑', '열쇠', '반지', '목걸이',
      '귀걸이', '팔찌', '머리핀', '립스틱', '향수', '화장품', '거울', '빗', '칫솔', '치약',
      '수건', '비누', '샴푸', '드라이기', '면도기', '충전기', '이어폰', '마우스', '키보드', '모니터',
      '프린터', '카메라', '삼각대', '마이크', '스피커', '헤드폰', '게임기', '리모컨', '선풍기', '청소기'
    ],
  };

  // 초기 로드 시 sessionStorage에서 user 및 room 정보 가져오기 (한 번만 실행)
  useEffect(() => {
    const savedUser = sessionStorage.getItem('multiUser');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setIsHost(parsed.isHost === true);
      } catch (e) {
        console.error('Failed to parse saved user:', e);
      }
    }

    // 저장된 방 정보가 있으면 먼저 로드 (참가자 목록 표시용)
    const savedRoom = sessionStorage.getItem('multiRoom');
    if (savedRoom && savedRoom !== 'undefined') {
      try {
        const parsedRoom = JSON.parse(savedRoom);
        if (parsedRoom && parsedRoom.roomId === roomId) {
          setRoom({
            roomId: parsedRoom.roomId,
            hostId: parsedRoom.hostId,
            userList: parsedRoom.userList || [],
            currentState: 'waiting',
          });
        }
      } catch (e) {
        console.error('Failed to parse saved room:', e);
      } finally {
        // 사용 후 항상 삭제
        sessionStorage.removeItem('multiRoom');
      }
    }
  }, [roomId]); // roomId만 dependency로 (한 번만 실행)

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      router.push('/multi');
      return;
    }

    // 재연결 요청 중복 방지 플래그
    let isRequestingInfo = false;
    let lastRequestTime = 0;
    const REQUEST_THROTTLE = 2000; // 2초 내 중복 요청 방지

    // 사용자 목록 업데이트
    const handleUserList = (data: { users: User[]; hostId: string; readyUsers?: string[]; currentState?: GameState }) => {
      console.log('📋 [클라이언트] room:user-list 수신', {
        isHost,
        readyUsers: data.readyUsers,
        readyUsers_타입: typeof data.readyUsers,
        readyUsers_undefined: data.readyUsers === undefined,
        readyUsers_null: data.readyUsers === null,
        readyUsers_길이: data.readyUsers?.length,
        users: data.users?.map(u => ({ userId: u.userId, nickname: u.nickname })),
        currentState: data.currentState
      });
      
      setRoom(prevRoom => {
        const roomData: Room = {
          roomId,
          hostId: data.hostId,
          userList: data.users || [],
          currentState: data.currentState || prevRoom?.currentState || 'waiting',
        };
        return roomData;
      });

      // 준비 상태 동기화 (서버에서 받은 readyUsers 정보 사용 - 서버가 최신 상태를 가지고 있으므로 항상 서버 값을 사용)
      // currentState가 'result'일 때도 readyUsers를 유지해야 함
      if (data.readyUsers && Array.isArray(data.readyUsers) && data.readyUsers.length > 0) {
        // 모든 userId를 문자열로 정규화
        const normalizedReadyUsers = data.readyUsers.map(id => String(id));
        const newReadyUsers = new Set(normalizedReadyUsers);
        
        console.log('🔄 [클라이언트] room:user-list에서 readyUsers 처리', {
          isHost,
          readyUsers_받은값: data.readyUsers,
          normalizedReadyUsers,
          newReadyUsers_크기: newReadyUsers.size,
          currentState: data.currentState
        });
        
        // 즉시 상태 업데이트 (이전 상태와 비교하여 실제 변경 시에만 업데이트)
        setReadyUsers(prev => {
          const prevArray = Array.from(prev);
          const newArray = Array.from(newReadyUsers);
          
          // 이전 상태와 비교하여 실제로 변경되었는지 확인
          const isChanged = prevArray.length !== newArray.length || 
            prevArray.some(id => !newArray.includes(id)) ||
            newArray.some(id => !prevArray.includes(id));
          
          if (isChanged) {
            console.log('✅ [클라이언트] room:user-list readyUsers 상태 업데이트 완료', {
              isHost,
              이전_크기: prev.size,
              이전_내용: prevArray,
              이후_크기: newReadyUsers.size,
              이후_내용: newArray,
              currentState: data.currentState
            });
            // 실제로 변경되었을 때만 새로운 Set 객체를 반환
            return new Set(newArray);
          } else {
            console.log('⏭️ [클라이언트] readyUsers 변경사항 없음 - 상태 유지', {
              isHost,
              readyUsers: prevArray,
              currentState: data.currentState
            });
            // 변경사항이 없어도 새로운 Set 객체를 반환하여 React가 변경을 감지하도록 함
            return new Set(newArray);
          }
        });
      } else {
        // readyUsers가 없거나 빈 배열이면 현재 상태 유지 (빈 배열로 초기화하지 않음)
        console.log('⚠️ [클라이언트] readyUsers 정보 없음 또는 빈 배열 - 현재 상태 유지', { 
          isHost,
          현재_readyUsers: Array.from(readyUsers),
          currentState: data.currentState,
          readyUsers_값: data.readyUsers
        });
      }

      // currentUser는 sessionStorage에서 가져오기
      const savedUser = sessionStorage.getItem('multiUser');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setIsHost(data.hostId === parsed.userId);
        } catch (e) {
          // ignore
        }
      }
    };

    // 게임 선택 알림 (설정 포함)
    const handleGameSelected = (data: { gameType: string | null; settings?: any }) => {
      if (data.gameType === null || data.gameType === undefined) {
        // 게임 선택 초기화
        setSelectedGame(null);
      } else {
        setSelectedGame(data.gameType);
        // Tune Coach 시간 설정 동기화
        if (data.gameType === 'tune-coach' && data.settings?.targetTime) {
          setTuneCoachTime(data.settings.targetTime);
        }
      }
    };

    // 준비 상태 업데이트
    const handleReadyUpdate = (data: { userId: string; isReady: boolean }) => {
      // userId를 문자열로 정규화
      const normalizedUserId = String(data.userId);
      
      console.log('🔄 [클라이언트] room:ready-update 수신', {
        isHost,
        userId: data.userId,
        userId_타입: typeof data.userId,
        normalizedUserId,
        isReady: data.isReady
      });
      
      setReadyUsers(prev => {
        const newSet = new Set(prev);
        if (data.isReady) {
          newSet.add(normalizedUserId);
        } else {
          newSet.delete(normalizedUserId);
        }
        console.log('✅ [클라이언트] readyUsers 업데이트 완료', {
          isHost,
          userId: data.userId,
          normalizedUserId,
          isReady: data.isReady,
          이전: Array.from(prev),
          이후: Array.from(newSet)
        });
        return newSet;
      });
    };

    // 모든 준비 상태 초기화 (게임 종료 시)
    const handleReadyReset = () => {
      setReadyUsers(new Set());
      setIsReady(false);
    };

    // 강제퇴장 당함
    const handleKicked = () => {
      alert('호스트에 의해 퇴장되었습니다.');
      router.push('/multi');
    };

    // 카운트다운 시작 (서버에서 브로드캐스트)
    const handleCountdownStart = () => {
      console.log('카운트다운 시작 이벤트 수신');
      // 카운트다운 시작 시 준비 상태 초기화
      setReadyUsers(new Set());
      setIsReady(false);
      
      setCountdown(3);
      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else {
          setCountdown(null);
          clearInterval(countdownInterval);
          
          // 호스트만 카운트다운 완료 후 게임 시작 요청
          if (isHost && selectedGame) {
            console.log('카운트다운 완료, 게임 시작 요청', { selectedGame });
            // 라이어 게임: 항상 랜덤 단어 선택
            let randomWord = '';
            if (selectedGame === 'liar-game') {
              const words = LIAR_WORDS[liarTopic] || LIAR_WORDS['음식'];
              randomWord = words[Math.floor(Math.random() * words.length)];
            }
            
            const settings = selectedGame === 'tune-coach' 
              ? { targetTime: tuneCoachTime }
              : selectedGame === 'liar-game'
              ? { topic: liarTopic, word: randomWord }
              : selectedGame === 'catch-mind'
              ? { rounds: catchMindRounds, timeLimit: 60 }
              : { question: '당신의 선택은?', optionA: 'A', optionB: 'B' };
            
            socket.emit('game:start', { gameType: selectedGame, settings });
          }
        }
      }, 1000);
    };

    // 게임 시작
    const handleGameStarted = (data: { gameType: string; gameData: any }) => {
      setCurrentGame(data.gameType);
      setGameData(data.gameData);
      setGameStarted(true);
      setGameFinished(false); // 게임 시작 시 종료 플래그 해제
      // 게임 시작 시 준비 상태 초기화
      setReadyUsers(new Set());
      setIsReady(false);
    };

    // 게임 업데이트
    const handleGameUpdate = (data: { gameType: string; gameData: any }) => {
      setGameData(data.gameData);
    };

    // 모든 클라이언트가 대기실로 돌아옴
    const handleAllBackToRoom = () => {
      setGameFinished(true); // 준비 버튼 활성화
      setSelectedGame(null); // 게임 선택 초기화 (처음 화면처럼)
    };

    // 게임 종료
    const handleGameFinished = () => {
      setGameStarted(false);
      setCurrentGame(null);
      setGameData(null);
      setCountdown(null);
      setGameFinished(false); // 게임 종료 시 초기에는 비활성화 (모두 돌아올 때까지 대기)
      
      // 게임 종료 후 최신 상태 요청 (준비 상태 동기화를 위해)
      const savedUser = sessionStorage.getItem('multiUser');
      const userId = savedUser ? JSON.parse(savedUser).userId : undefined;
      socket.emit('room:request-info', { roomId, userId });
    };

    // 방 정보 요청 (중복 방지)
    const requestRoomInfo = () => {
      const now = Date.now();
      if (isRequestingInfo || (now - lastRequestTime < REQUEST_THROTTLE)) {
        return; // 이미 요청 중이거나 최근에 요청했으면 스킵
      }
      
      isRequestingInfo = true;
      lastRequestTime = now;
      
      const savedUser = sessionStorage.getItem('multiUser');
      const userId = savedUser ? JSON.parse(savedUser).userId : undefined;
      
      socket.emit('room:request-info', { roomId, userId });
      
      setTimeout(() => {
        isRequestingInfo = false;
      }, REQUEST_THROTTLE);
    };

    // 재연결 시 방 상태 복구
    const handleReconnect = () => {
      console.log('재연결됨, 방 상태 복구 중...');
      requestRoomInfo();
    };

    // 연결 상태 확인
    const handleConnect = () => {
      console.log('Socket 연결됨');
      requestRoomInfo();
    };

    // 페이지 visibility 변경 감지 (백그라운드/포그라운드)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('페이지 포그라운드로 복귀, 상태 확인 중...');
        if (socket && socket.connected) {
          requestRoomInfo();
        } else if (socket) {
          // 연결이 끊어졌다면 재연결 시도
          socket.connect();
        }
      }
    };

    socket.on('connect', handleConnect);
    socket.on('reconnect', handleReconnect);
    socket.on('room:user-list', handleUserList);
    socket.on('room:game-selected', handleGameSelected);
    socket.on('room:ready-update', handleReadyUpdate);
    socket.on('room:ready-reset', handleReadyReset);
    socket.on('room:kicked', handleKicked);
    socket.on('room:all-back-to-room', handleAllBackToRoom);
    socket.on('countdown:start', handleCountdownStart);
    socket.on('game:started', handleGameStarted);
    socket.on('game:update', handleGameUpdate);
    socket.on('game:finished', handleGameFinished);

    // visibility API 이벤트 리스너
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 초기 연결 시 방 정보 요청
    if (socket.connected) {
      requestRoomInfo();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('reconnect', handleReconnect);
      socket.off('room:user-list', handleUserList);
      socket.off('room:game-selected', handleGameSelected);
      socket.off('room:ready-update', handleReadyUpdate);
      socket.off('room:ready-reset', handleReadyReset);
      socket.off('room:kicked', handleKicked);
      socket.off('room:all-back-to-room', handleAllBackToRoom);
      socket.off('countdown:start', handleCountdownStart);
      socket.off('game:started', handleGameStarted);
      socket.off('game:update', handleGameUpdate);
      socket.off('game:finished', handleGameFinished);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId, router, isHost, selectedGame, tuneCoachTime, liarTopic, catchMindRounds]); // 카운트다운에서 사용하는 상태 포함

  // readyUsers 상태 변경 추적 (디버깅)
  useEffect(() => {
    console.log('🔍 [상태 추적] readyUsers 변경됨', {
      isHost,
      readyUsers: Array.from(readyUsers),
      readyUsers_크기: readyUsers.size,
      room_userList: room?.userList?.map(u => ({ userId: u.userId, nickname: u.nickname }))
    });
  }, [readyUsers, isHost, room?.userList]);


  // 게임 선택 (호스트)
  const handleSelectGame = (gameType: string) => {
    const socket = getSocket();
    if (socket && isHost) {
      const settings = gameType === 'tune-coach' ? { targetTime: tuneCoachTime } : {};
      socket.emit('room:select-game', { gameType, settings });
      setSelectedGame(gameType);
    }
  };
  
  // Tune Coach 시간 변경 (호스트) - 서버에 동기화
  const handleTuneCoachTimeChange = (time: number) => {
    setTuneCoachTime(time);
    const socket = getSocket();
    if (socket && isHost && selectedGame === 'tune-coach') {
      socket.emit('room:select-game', { gameType: 'tune-coach', settings: { targetTime: time } });
    }
  };

  // 게임 시작 (호스트)
  const handleStartGame = () => {
    console.log('게임 시작 버튼 클릭', { selectedGame, isHost, currentUser });
    
    if (!selectedGame) {
      console.log('게임이 선택되지 않음');
      return;
    }
    
    if (!isHost) {
      console.log('호스트가 아님');
      return;
    }
    
    const socket = getSocket();
    if (!socket) {
      console.log('소켓이 없음');
      return;
    }
    
    console.log('카운트다운 시작 요청 전송', { 
      socketConnected: socket.connected, 
      socketId: socket.id 
    });
    // 서버에 카운트다운 시작 요청 (서버에서 준비 상태 확인)
    socket.emit('game:countdown-start', (response: { success?: boolean; error?: string }) => {
      if (response?.error) {
        console.log('카운트다운 시작 실패:', response.error);
        if (response.error === '모든 참가자가 준비되지 않음') {
          alert('모든 참가자가 준비를 완료해야 게임을 시작할 수 있습니다!');
        } else if (response.error === '호스트가 아님') {
          alert('호스트만 게임을 시작할 수 있습니다!');
        }
      } else if (response?.success) {
        console.log('서버에서 카운트다운 시작 요청 확인됨');
      }
    });
    
    // 이벤트 전송 확인
    socket.once('countdown:start', () => {
      console.log('카운트다운 시작 이벤트 수신 확인');
    });
  };

  // 대기실로 돌아가기 (개별적으로)
  const handleBackToRoom = () => {
    // 서버에 대기실 복귀 알림
    const socket = getSocket();
    if (socket) {
      socket.emit('game:back-to-room');
    }
    
    // 클라이언트 상태 변경
    setGameStarted(false);
    setCurrentGame(null);
    setGameData(null);
    setCountdown(null);
    // 대기실로 돌아올 때 준비 상태 초기화
    setReadyUsers(new Set());
    setIsReady(false);
    // 게임 선택 초기화 (방 처음 만든 상태로)
    setSelectedGame(null);
  };

  // 준비 상태 토글 (참가자)
  const handleToggleReady = () => {
    const socket = getSocket();
    if (socket) {
      const newReady = !isReady;
      socket.emit('room:ready', { isReady: newReady });
      setIsReady(newReady);
    }
  };

  // 강제퇴장 (호스트)
  const handleKickUser = (targetUserId: string) => {
    if (!confirm('이 사용자를 퇴장시키시겠습니까?')) return;
    
    const socket = getSocket();
    if (socket && isHost) {
      socket.emit('room:kick', { targetUserId });
    }
  };

  // 게임 렌더링
  const renderGame = () => {
    if (!gameStarted || !currentGame) return null;

    const gameDataWithRoom = {
      ...gameData,
      userList: room?.userList || [],
    };

    switch (currentGame) {
      case 'tune-coach':
        return <TuneCoach gameData={gameDataWithRoom} isHost={isHost} onBackToRoom={handleBackToRoom} />;
      case 'liar-game':
        return <LiarGame gameData={gameDataWithRoom} isHost={isHost} onBackToRoom={handleBackToRoom} />;
      case 'catch-mind':
        return <CatchMind gameData={gameDataWithRoom} isHost={isHost} onBackToRoom={handleBackToRoom} />;
      default:
        return null;
    }
  };

  // 선택된 게임 정보
  const selectedGameInfo = GAMES.find(g => g.id === selectedGame);

  // 대기실 화면
  if (!gameStarted) {
    // 카운트다운 중이면 카운트다운 화면 표시
    if (countdown !== null && countdown > 0) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
          <div className="text-center">
            <div className="text-9xl font-bold text-black animate-pulse">
              {countdown}
            </div>
            <div className="mt-4 text-2xl font-semibold text-black">
              게임 시작 준비 중...
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-pink-100 to-purple-100 p-4">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {/* 헤더 */}
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h1 className="mb-2 text-center text-2xl font-bold text-black">
              방 PIN: {roomId}
            </h1>
            <p className="text-center text-lg font-semibold text-black">
              {isHost ? '🎮 호스트' : '👤 참가자'}
            </p>
          </div>

          {/* 선택된 게임 표시 (모두에게) */}
          {selectedGame && (
            <div className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 p-4 shadow-xl">
              <p className="text-center text-lg font-bold text-black">
                🎯 선택된 게임: {selectedGameInfo?.name}
              </p>
              <p className="text-center text-sm font-medium text-black">
                {selectedGame === 'tune-coach' 
                  ? `${tuneCoachTime}초 맞추기`
                  : selectedGameInfo?.description}
              </p>
            </div>
          )}

          {/* 사용자 목록 */}
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-black">참가자 ({room?.userList?.length || 0}명)</h2>
            <div className="space-y-2">
              {room?.userList && room.userList.length > 0 ? (
                room.userList.map((user) => {
                  // userId를 문자열로 정규화하여 비교
                  const normalizedUserId = String(user.userId);
                  // readyUsers 상태를 직접 사용 (최신 값 보장)
                  const isUserReady = readyUsers.has(normalizedUserId);
                  const isUserHost = user.userId === room.hostId;
                  
                  return (
                    <div
                      key={user.userId}
                      className={`flex items-center justify-between rounded-lg p-3 transition-all ${
                        isUserHost 
                          ? 'bg-yellow-50 border-2 border-yellow-400' 
                          : isUserReady 
                          ? 'bg-green-50 border-2 border-green-400' 
                          : 'bg-gray-100 border-2 border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-black">{user.nickname}</span>
                        {isUserHost && (
                          <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-black">
                            호스트
                          </span>
                        )}
                        {!isUserHost && isUserReady && (
                          <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white animate-pulse">
                            ✅ 준비완료
                          </span>
                        )}
                        {!isUserHost && !isUserReady && (
                          <span className="rounded-full bg-gray-400 px-3 py-1 text-xs font-bold text-white">
                            ⏳ 대기중
                          </span>
                        )}
                      </div>
                      {/* 강제퇴장 버튼 (호스트만, 자기 자신 제외) */}
                      {isHost && user.userId !== currentUser?.userId && (
                        <button
                          onClick={() => handleKickUser(user.userId)}
                          className="rounded-lg bg-red-500 px-3 py-1 text-sm font-bold text-white transition-all hover:bg-red-600 active:scale-95"
                        >
                          퇴장
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-4">
                  참가자가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 게임 시작 버튼 (호스트만, 참가자 패널과 게임 선택 패널 사이) */}
          {isHost && selectedGame && (
            <button
              onClick={handleStartGame}
              className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 text-xl font-bold text-white transition-all hover:from-green-600 hover:to-emerald-600 active:scale-95"
            >
              🚀 게임 시작!
            </button>
          )}

          {/* 게임 선택 (호스트만) */}
          {isHost && (
            <div className="rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-bold text-black">게임 선택</h2>
              <div className="space-y-2">
                {GAMES.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleSelectGame(game.id)}
                    className={`w-full rounded-xl px-6 py-4 text-lg font-bold text-white transition-all active:scale-95 ${
                      selectedGame === game.id 
                        ? 'ring-4 ring-yellow-400 ' + game.color
                        : game.color
                    }`}
                  >
                    {game.name}
                    {selectedGame === game.id && ' ✓'}
                  </button>
                ))}
              </div>

              {/* Tune Coach 시간 설정 */}
              {selectedGame === 'tune-coach' && (
                <div className="mt-4 rounded-xl bg-blue-50 p-4">
                  <h3 className="mb-2 text-sm font-bold text-black">목표 시간 설정</h3>
                  <div className="flex gap-2">
                    {[5, 10, 15].map((time) => (
                      <button
                        key={time}
                        onClick={() => handleTuneCoachTimeChange(time)}
                        className={`flex-1 rounded-lg px-4 py-2 text-lg font-bold transition-all ${
                          tuneCoachTime === time
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-black hover:bg-blue-100'
                        }`}
                      >
                        {time}초
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Liar Game 주제 설정 */}
              {selectedGame === 'liar-game' && (
                <div className="mt-4 rounded-xl bg-red-50 p-4">
                  <h3 className="mb-2 text-sm font-bold text-black">주제 선택</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(LIAR_WORDS).map((topic) => (
                      <button
                        key={topic}
                        onClick={() => setLiarTopic(topic)}
                        className={`rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                          liarTopic === topic
                            ? 'bg-red-500 text-white'
                            : 'bg-white text-black hover:bg-red-100'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    🎲 단어는 주제에서 랜덤으로 선택됩니다
                  </p>
                </div>
              )}

              {/* Catch Mind 설정 */}
              {selectedGame === 'catch-mind' && (
                <div className="mt-4 rounded-xl bg-orange-50 p-4">
                  <h3 className="mb-2 text-sm font-bold text-black">라운드 수</h3>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((rounds) => (
                      <button
                        key={rounds}
                        onClick={() => setCatchMindRounds(rounds)}
                        className={`flex-1 rounded-lg px-4 py-2 text-lg font-bold transition-all ${
                          catchMindRounds === rounds
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-black hover:bg-orange-100'
                        }`}
                      >
                        {rounds}라운드
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    🎨 모든 참가자가 출제자가 되면 1라운드 (단어는 랜덤)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 대기 중 + 준비 버튼 (참가자만) */}
          {!isHost && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-100 p-6 text-center">
                <p className="text-lg font-semibold text-black">
                  {selectedGame 
                    ? `"${selectedGameInfo?.name}" 게임이 선택되었습니다!`
                    : '호스트가 게임을 선택할 때까지 기다려주세요...'}
                </p>
              </div>
              
              {/* 준비 버튼 */}
              <button
                onClick={handleToggleReady}
                disabled={gameStarted || currentGame !== null}
                className={`w-full rounded-xl px-6 py-4 text-xl font-bold text-white transition-all active:scale-95 ${
                  gameStarted || currentGame !== null
                    ? 'bg-gray-400 cursor-not-allowed'
                    : isReady 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {gameStarted || currentGame !== null
                  ? '⏳ 게임 진행 중...' 
                  : isReady 
                  ? '✅ 준비 완료!' 
                  : '🙋 준비하기'}
              </button>
            </div>
          )}

          {/* 나가기 버튼 */}
          <button
            onClick={() => {
              const socket = getSocket();
              if (socket) {
                socket.emit('room:leave');
              }
              router.push('/multi');
            }}
            className="w-full rounded-xl bg-gray-700 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-gray-800 active:scale-95"
          >
            방 나가기
          </button>
        </div>
      </div>
    );
  }

  // 게임 화면
  return renderGame();
}
