// 게임 관련 타입 정의

// 터치 포인트 타입
export interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

// Shake It 게임 설정
export interface ShakeItSettings {
  sensitivity: 'low' | 'medium' | 'high' | 'random';
  totalLimit: number;
  currentCount: number;
}

// 사용자 타입
export interface User {
  userId: string;
  nickname: string;
  isPremium: boolean;
}

// 게임 상태
export type GameState = 'waiting' | 'playing' | 'result';

// 방 타입
export interface Room {
  roomId: string;
  hostId: string;
  userList: User[];
  currentState: GameState;
  gameType?: 'tune-coach' | 'liar-game' | 'catch-mind';
  gameData?: any;
}

// Tune Coach 게임 데이터
export interface PlayerResult {
  userId: string;
  nickname: string;
  stopTime: number;
  error: number;
  rank: number | null;
}

export interface TuneCoachData {
  targetTime: number;
  startTime: number;
  playerResults: PlayerResult[];
  blindTime: number;
}

// Liar Game 게임 데이터
export interface LiarGameData {
  topic: string;
  word: string;
  roles: { [userId: string]: 'citizen' | 'liar' | 'fool' };
  explanations: { [userId: string]: string };
  votes: { [oderId: string]: string }; // voterId -> targetId
  round: number;
}

// Telepathy 게임 데이터
export interface TelepathyData {
  question: string;
  optionA: string;
  optionB: string;
  playerChoices: { [userId: string]: 'A' | 'B' };
  timeLimit: number;
  startTime: number;
}

// Catch Mind 게임 데이터
export interface CatchMindData {
  word: string; // 현재 단어
  drawerId: string; // 현재 출제자 ID
  drawerIndex: number; // 현재 출제자 인덱스
  round: number; // 현재 라운드
  maxRounds: number; // 총 라운드 수
  timeLimit: number; // 제한 시간 (초)
  startTime: number; // 라운드 시작 시간
  scores: { [userId: string]: number }; // 점수
  correctUsers: string[]; // 이번 라운드에 맞춘 사람들
  topic: string; // 주제
}
