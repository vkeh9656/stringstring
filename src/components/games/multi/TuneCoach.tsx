'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { TuneCoachData, PlayerResult } from '@/types/game';

interface TuneCoachProps {
  gameData: TuneCoachData;
  isHost: boolean;
  onBackToRoom: () => void;
}

// Tune Coach 게임 컴포넌트
export default function TuneCoach({ gameData, isHost, onBackToRoom }: TuneCoachProps) {
  const router = useRouter();
  const [time, setTime] = useState(0);
  const [isBlind, setIsBlind] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // 게임 시작 (gameData.startTime이 카운트다운 완료 후 설정됨)
    if (gameData.startTime && gameData.startTime > 0) {
      const updateTime = () => {
        const elapsed = (Date.now() - gameData.startTime!) / 1000;
        setTime(elapsed);

        // 블라인드 시작
        if (elapsed >= gameData.blindTime / 1000 && !isBlind) {
          setIsBlind(true);
        }
      };

      intervalRef.current = setInterval(updateTime, 10);
    }

    // 결과 수신
    const handleResults = (data: { results: PlayerResult[] }) => {
      setResults(data.results);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    socket.on('tune-coach:results', handleResults);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      socket.off('tune-coach:results', handleResults);
    };
  }, [gameData, isBlind]);

  // 정지 버튼 클릭
  const handleStop = () => {
    if (stopped) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('tune-coach:stop', { timestamp: Date.now() });
      setStopped(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  // 다시하기 (호스트만)
  const handleRestart = () => {
    const socket = getSocket();
    if (socket && isHost) {
      socket.emit('game:start', { gameType: 'tune-coach', settings: { targetTime: 5.0 } });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 게임 화면 */}
        {results.length === 0 && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-xl text-center">
            <h1 className="text-3xl font-bold text-gray-800">⏱️ Tune Coach</h1>
            <p className="text-gray-600">목표: {gameData.targetTime}초</p>

            {/* 타이머 */}
            <div className="py-8">
              <div className={`text-8xl font-bold ${isBlind ? 'text-gray-400' : 'text-blue-600'}`}>
                {isBlind ? '???' : time.toFixed(2)}
              </div>
            </div>

            {/* 정지 버튼 */}
            {!stopped && (
              <button
                onClick={handleStop}
                className="w-full rounded-xl bg-red-500 px-6 py-4 text-2xl font-bold text-white transition-all hover:bg-red-600 active:scale-95"
              >
                STOP
              </button>
            )}

            {stopped && (
              <div className="rounded-xl bg-yellow-100 p-4 text-lg font-semibold text-yellow-800">
                정지했습니다! 결과를 기다리는 중...
              </div>
            )}
          </div>
        )}

        {/* 결과 화면 */}
        {results.length > 0 && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-xl">
            <h2 className="text-center text-2xl font-bold text-gray-800">🏆 결과</h2>
            <div className="space-y-3">
              {results
                .sort((a, b) => a.rank! - b.rank!)
                .map((result) => (
                  <div
                    key={result.userId}
                    className="flex items-center justify-between rounded-lg bg-gray-100 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-blue-600">
                        {result.rank}등
                      </span>
                      <span className="text-lg font-semibold text-black">{result.nickname}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">오차</div>
                      <div className="text-lg font-bold text-red-600">
                        {result.error.toFixed(3)}초
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <button
              onClick={onBackToRoom}
              className="w-full rounded-xl bg-blue-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-blue-600 active:scale-95"
            >
              대기실로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


