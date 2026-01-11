// Socket.io 이벤트 타입 정의

// 클라이언트 -> 서버 이벤트
export interface ClientToServerEvents {
  // 방 관련
  'room:create': (data: { nickname: string }) => void;
  'room:join': (data: { roomId: string; nickname: string }) => void;
  'room:leave': () => void;
  'room:ready': (data: { isReady: boolean }) => void;
  'room:kick': (data: { targetUserId: string }) => void;
  'room:select-game': (data: { gameType: string }) => void;
  'room:request-info': (data: { roomId: string; userId?: string }) => void; // 방 정보 요청 (재연결 시 userId 포함)
  'game:end': () => void;
  'game:back-to-room': () => void; // 대기실로 돌아가기 (개별적으로)
  
  // 게임 관련
  'game:countdown-start': (callback?: (response: { success?: boolean; error?: string }) => void) => void; // 카운트다운 시작 요청 (호스트만)
  'game:start': (data: { gameType: string; settings?: any }) => void;
  'game:action': (data: { gameType: string; action: string; payload?: any }) => void;
  
  // Tune Coach
  'tune-coach:stop': (data: { timestamp: number }) => void;
  
  // Liar Game
  'liar-game:explain': (data: { explanation: string }) => void;
  'liar-game:vote': (data: { targetUserId: string }) => void;
  
  // Telepathy
  'telepathy:choose': (data: { choice: 'A' | 'B' }) => void;
  
  // Catch Mind (캐치마인드)
  'catchmind:draw': (data: { drawData: any }) => void; // 그림 데이터 전송
  'catchmind:guess': (data: { guess: string }) => void; // 정답 추측
  'catchmind:clear': () => void; // 캔버스 지우기
  'catchmind:skip': () => void; // 출제자 포기
}

// 서버 -> 클라이언트 이벤트
export interface ServerToClientEvents {
  // 방 관련
  'room:created': (data: { roomId: string; user: any }) => void;
  'room:joined': (data: { room: any; user: any }) => void;
  'room:left': (data: { userId: string }) => void;
  'room:user-list': (data: { users: any[]; hostId: string; readyUsers?: string[]; currentState?: 'waiting' | 'playing' | 'result' }) => void;
  'room:error': (data: { message: string }) => void;
  'room:kicked': (data: { userId: string }) => void;
  'room:game-selected': (data: { gameType: string | null; settings?: any }) => void;
  'room:ready-update': (data: { userId: string; isReady: boolean }) => void;
  'room:ready-reset': () => void; // 모든 준비 상태 초기화
  'room:all-back-to-room': () => void; // 모든 클라이언트가 대기실로 돌아옴
  
  // 게임 관련
  'countdown:start': () => void; // 카운트다운 시작 (모든 클라이언트)
  'game:started': (data: { gameType: string; gameData: any }) => void;
  'game:update': (data: { gameType: string; gameData: any }) => void;
  'game:finished': (data: { gameType: string; results: any }) => void;
  
  // Tune Coach
  'tune-coach:started': (data: { startTime: number; targetTime: number; blindTime: number }) => void;
  'tune-coach:stopped': (data: { userId: string; stopTime: number }) => void;
  'tune-coach:results': (data: { results: any[] }) => void;
  
  // Liar Game
  'liar-game:started': (data: { topic: string; word: string; role: string }) => void;
  'liar-game:explained': (data: { userId: string; explanation: string }) => void;
  'liar-game:voted': (data: { userId: string; targetUserId: string }) => void;
  'liar-game:results': (data: { votes: any; liar: string }) => void;
  
  // Telepathy
  'telepathy:started': (data: { question: string; optionA: string; optionB: string; timeLimit: number }) => void;
  'telepathy:chosen': (data: { userId: string; choice: 'A' | 'B' }) => void;
  'telepathy:results': (data: { success: boolean; choices: any; traitor?: string }) => void;
  
  // Catch Mind (캐치마인드)
  'catchmind:started': (data: { drawerId: string; drawerNickname: string; word: string | null; timeLimit: number; round: number; maxRounds: number }) => void;
  'catchmind:draw': (data: { drawData: any }) => void; // 그림 데이터 브로드캐스트
  'catchmind:clear': () => void; // 캔버스 지우기 브로드캐스트
  'catchmind:correct': (data: { oderId: string; guessernickname: string; answer: string; scores: any; scoreGained?: number }) => void;
  'catchmind:chat': (data: { oderId: string; nickname: string; message: string }) => void; // 채팅 메시지
  'catchmind:skipped': (data: { answer: string; drawerNickname: string }) => void; // 출제자 포기
  'catchmind:timeout': (data: { answer: string; scores: any }) => void; // 시간 초과
  'catchmind:next-turn': (data: { drawerId: string; drawerNickname: string; word: string | null; round: number; timeLeft?: number; correctUsers?: string[] }) => void;
  'catchmind:results': (data: { scores: any; winner: string }) => void;
}


