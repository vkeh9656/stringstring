'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { connectSocket, getSocket } from '@/lib/socket';
import { ServerToClientEvents, ClientToServerEvents } from '@/types/socket';

// Multi Mode 메인 페이지 (방 생성/참가)
export default function MultiModePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Socket 연결
    const socket = connectSocket();

    socket.on('room:created', (data: Parameters<ServerToClientEvents['room:created']>[0]) => {
      setCreatedRoomId(data.roomId);
      // 호스트 정보를 sessionStorage에 저장
      sessionStorage.setItem('multiUser', JSON.stringify({
        ...data.user,
        isHost: true,
      }));
      // 방 정보도 저장 (호스트도 참가자 목록에 표시되도록)
      if ((data as any).room) {
        sessionStorage.setItem('multiRoom', JSON.stringify((data as any).room));
      }
      router.push(`/multi/room/${data.roomId}`);
    });

    socket.on('room:joined', (data: Parameters<ServerToClientEvents['room:joined']>[0]) => {
      // 참가자 정보를 sessionStorage에 저장
      sessionStorage.setItem('multiUser', JSON.stringify({
        ...data.user,
        isHost: false,
      }));
      // 방 정보도 저장 (참가자 목록 표시용)
      sessionStorage.setItem('multiRoom', JSON.stringify(data.room));
      router.push(`/multi/room/${data.room.roomId}`);
    });

    socket.on('room:error', (data: Parameters<ServerToClientEvents['room:error']>[0]) => {
      setError(data.message);
    });

    return () => {
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:error');
    };
  }, [router]);

  // 방 생성
  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요');
      return;
    }

    const socket = getSocket();
    if (socket) {
      socket.emit('room:create', { nickname: nickname.trim() });
    }
  };

  // 방 참가
  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요');
      return;
    }
    if (!roomId.trim() || roomId.length !== 4) {
      setError('4자리 PIN 코드를 입력해주세요');
      return;
    }

    const socket = getSocket();
    if (socket) {
      socket.emit('room:join', { roomId: roomId.trim(), nickname: nickname.trim() });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-pink-100 to-purple-100 p-4">
      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="rounded-full bg-white/80 px-4 py-2 text-lg font-semibold text-black shadow-md transition-all hover:bg-white"
        >
          ← 뒤로
        </Link>
        <h1 className="text-2xl font-bold text-black">함께하기</h1>
        <div className="w-20"></div>
      </div>

      <div className="mx-auto w-full max-w-md">
        {/* 모드 선택 */}
        {mode === 'select' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-6 text-2xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              🎮 방 만들기
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-6 text-2xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              🔢 PIN으로 참가
            </button>
          </div>
        )}

        {/* 방 생성 */}
        {mode === 'create' && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-xl">
            <h2 className="text-center text-2xl font-bold text-black">방 만들기</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-black">
                  닉네임
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg text-black placeholder:text-gray-500 focus:border-pink-500 focus:outline-none"
                  maxLength={10}
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-100 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={handleCreateRoom}
                  className="w-full rounded-xl bg-pink-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-pink-600 active:scale-95"
                >
                  방 만들기
                </button>
                <button
                  onClick={() => {
                    setMode('select');
                    setError('');
                    setNickname('');
                  }}
                  className="w-full rounded-xl bg-gray-300 px-6 py-4 text-lg font-bold text-black transition-all hover:bg-gray-400 active:scale-95"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 방 참가 */}
        {mode === 'join' && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-xl">
            <h2 className="text-center text-2xl font-bold text-black">방 참가</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-black">
                  닉네임
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-black">
                  PIN 코드 (4자리)
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setRoomId(value);
                  }}
                  placeholder="0000"
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-center text-3xl font-bold tracking-widest text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                  maxLength={4}
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-100 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={handleJoinRoom}
                  className="w-full rounded-xl bg-blue-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-blue-600 active:scale-95"
                >
                  참가하기
                </button>
                <button
                  onClick={() => {
                    setMode('select');
                    setError('');
                    setNickname('');
                    setRoomId('');
                  }}
                  className="w-full rounded-xl bg-gray-300 px-6 py-4 text-lg font-bold text-black transition-all hover:bg-gray-400 active:scale-95"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


