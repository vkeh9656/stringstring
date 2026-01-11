// SQLite 데이터베이스 관리
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// DB 파일 경로 (server 디렉토리 내)
// tsx는 CommonJS 모드로 실행되므로 __dirname 사용 가능
// 만약 __dirname이 없다면 현재 작업 디렉토리의 server 폴더 사용
const DB_DIR = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.join(process.cwd(), 'server');
const DB_PATH = path.join(DB_DIR, 'game.db');

// DB 디렉토리가 없으면 생성
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 데이터베이스 연결
const db = new Database(DB_PATH);

// 초기화: 테이블 생성
db.exec(`
  -- 방 정보 테이블
  CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    host_id TEXT NOT NULL,
    current_state TEXT DEFAULT 'waiting',
    selected_game TEXT,
    game_settings TEXT, -- JSON 문자열
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- 사용자 정보 테이블
  CREATE TABLE IF NOT EXISTS users (
    socket_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    room_id TEXT,
    is_ready INTEGER DEFAULT 0, -- 0: false, 1: true
    is_host INTEGER DEFAULT 0, -- 0: false, 1: true
    connected_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
  );

  -- 게임 상태 테이블
  CREATE TABLE IF NOT EXISTS game_states (
    room_id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL,
    game_data TEXT NOT NULL, -- JSON 문자열
    started_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
  );

  -- 인덱스 생성 (조회 성능 향상)
  CREATE INDEX IF NOT EXISTS idx_users_room_id ON users(room_id);
  CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
  CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);
`);

// 트랜잭션 헬퍼
export const transaction = <T>(fn: (db: Database.Database) => T): T => {
  const transaction = db.transaction(fn);
  return transaction();
};

// 방 관련 함수
export const roomQueries = {
  // 방 생성
  create: (roomId: string, hostId: string) => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO rooms (room_id, host_id, current_state, created_at, updated_at)
      VALUES (?, ?, 'waiting', ?, ?)
    `).run(roomId, hostId, now, now);
  },

  // 방 조회
  get: (roomId: string) => {
    return db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(roomId) as {
      room_id: string;
      host_id: string;
      current_state: string;
      selected_game: string | null;
      game_settings: string | null;
      created_at: number;
      updated_at: number;
    } | undefined;
  },

  // 방 상태 업데이트
  updateState: (roomId: string, state: string) => {
    db.prepare(`
      UPDATE rooms 
      SET current_state = ?, updated_at = ?
      WHERE room_id = ?
    `).run(state, Date.now(), roomId);
  },

  // 선택된 게임 업데이트
  updateSelectedGame: (roomId: string, gameType: string | null, settings: any = null) => {
    db.prepare(`
      UPDATE rooms 
      SET selected_game = ?, game_settings = ?, updated_at = ?
      WHERE room_id = ?
    `).run(
      gameType,
      settings ? JSON.stringify(settings) : null,
      Date.now(),
      roomId
    );
  },

  // 방 삭제
  delete: (roomId: string) => {
    db.prepare('DELETE FROM rooms WHERE room_id = ?').run(roomId);
  },

  // 모든 방 조회
  getAll: () => {
    return db.prepare('SELECT * FROM rooms').all() as Array<{
      room_id: string;
      host_id: string;
      current_state: string;
      selected_game: string | null;
      game_settings: string | null;
      created_at: number;
      updated_at: number;
    }>;
  },
};

// 사용자 관련 함수
export const userQueries = {
  // 사용자 추가/업데이트
  upsert: (socketId: string, userId: string, nickname: string, roomId: string | null, isReady: boolean, isHost: boolean) => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO users (socket_id, user_id, nickname, room_id, is_ready, is_host, connected_at, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(socket_id) DO UPDATE SET
        user_id = excluded.user_id,
        nickname = excluded.nickname,
        room_id = excluded.room_id,
        is_ready = excluded.is_ready,
        is_host = excluded.is_host,
        last_seen = excluded.last_seen
    `).run(socketId, userId, nickname, roomId, isReady ? 1 : 0, isHost ? 1 : 0, now, now);
  },

  // 사용자 조회 (socket_id로)
  getBySocketId: (socketId: string) => {
    return db.prepare('SELECT * FROM users WHERE socket_id = ?').get(socketId) as {
      socket_id: string;
      user_id: string;
      nickname: string;
      room_id: string | null;
      is_ready: number;
      is_host: number;
      connected_at: number;
      last_seen: number;
    } | undefined;
  },

  // 사용자 조회 (user_id로)
  getByUserId: (userId: string, roomId: string) => {
    return db.prepare('SELECT * FROM users WHERE user_id = ? AND room_id = ? ORDER BY last_seen DESC LIMIT 1').get(userId, roomId) as {
      socket_id: string;
      user_id: string;
      nickname: string;
      room_id: string | null;
      is_ready: number;
      is_host: number;
      connected_at: number;
      last_seen: number;
    } | undefined;
  },

  // 방의 모든 사용자 조회
  getByRoomId: (roomId: string) => {
    return db.prepare('SELECT * FROM users WHERE room_id = ? ORDER BY connected_at ASC').all(roomId) as Array<{
      socket_id: string;
      user_id: string;
      nickname: string;
      room_id: string | null;
      is_ready: number;
      is_host: number;
      connected_at: number;
      last_seen: number;
    }>;
  },

  // 사용자 삭제
  delete: (socketId: string) => {
    db.prepare('DELETE FROM users WHERE socket_id = ?').run(socketId);
  },

  // 사용자 준비 상태 업데이트
  updateReady: (socketId: string, isReady: boolean) => {
    db.prepare('UPDATE users SET is_ready = ?, last_seen = ? WHERE socket_id = ?').run(
      isReady ? 1 : 0,
      Date.now(),
      socketId
    );
  },

  // 사용자 last_seen 업데이트
  updateLastSeen: (socketId: string) => {
    db.prepare('UPDATE users SET last_seen = ? WHERE socket_id = ?').run(Date.now(), socketId);
  },
};

// 게임 상태 관련 함수
export const gameStateQueries = {
  // 게임 상태 저장/업데이트
  upsert: (roomId: string, gameType: string, gameData: any) => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO game_states (room_id, game_type, game_data, started_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(room_id) DO UPDATE SET
        game_type = excluded.game_type,
        game_data = excluded.game_data,
        updated_at = excluded.updated_at
    `).run(roomId, gameType, JSON.stringify(gameData), now, now);
  },

  // 게임 상태 조회
  get: (roomId: string) => {
    const result = db.prepare('SELECT * FROM game_states WHERE room_id = ?').get(roomId) as {
      room_id: string;
      game_type: string;
      game_data: string;
      started_at: number;
      updated_at: number;
    } | undefined;
    
    if (!result) return null;
    
    return {
      gameType: result.game_type,
      gameData: JSON.parse(result.game_data),
      startedAt: result.started_at,
      updatedAt: result.updated_at,
    };
  },

  // 게임 상태 삭제
  delete: (roomId: string) => {
    db.prepare('DELETE FROM game_states WHERE room_id = ?').run(roomId);
  },
};

// 정리: 오래된 방 삭제 (24시간 이상 비활성)
export const cleanupOldRooms = () => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  db.prepare('DELETE FROM rooms WHERE updated_at < ?').run(oneDayAgo);
};

// 주기적으로 정리 작업 실행 (1시간마다)
setInterval(cleanupOldRooms, 60 * 60 * 1000);

export default db;

