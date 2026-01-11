// Socket.io 클라이언트 연결 관리
import io from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';

// Socket 타입 정의
type SocketType = ReturnType<typeof io>;

let socket: SocketType | null = null;

// Socket URL 동적 생성 (모바일 지원)
const getSocketUrl = (): string => {
  // 환경 변수가 설정되어 있으면 사용
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  
  // 브라우저 환경에서 현재 호스트 기반으로 소켓 URL 생성
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:3001`;
  }
  
  // 서버 사이드 렌더링 시 기본값
  return 'http://localhost:3001';
};

// Socket 연결 생성
export const connectSocket = (): SocketType => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'], // polling도 허용 (모바일 호환성)
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // 무한 재시도
      timeout: 20000, // 연결 타임아웃 20초
      forceNew: false, // 기존 연결 재사용
    });
    
    // 재연결 이벤트 로깅
    socket.on('reconnect', (attemptNumber: number) => {
      console.log('Socket 재연결 성공:', attemptNumber);
    });
    
    socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('Socket 재연결 시도:', attemptNumber);
    });
    
    socket.on('reconnect_error', (error: Error) => {
      console.log('Socket 재연결 오류:', error);
    });
    
    socket.on('reconnect_failed', () => {
      console.log('Socket 재연결 실패');
    });
  }
  return socket;
};

// Socket 연결 해제
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Socket 인스턴스 가져오기
export const getSocket = (): SocketType | null => {
  return socket;
};


