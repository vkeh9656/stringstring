'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';

interface TelepathyProps {
  gameData: any;
  isHost: boolean;
  onBackToRoom: () => void;
}

// Telepathy 게임 컴포넌트
export default function Telepathy({ gameData, isHost, onBackToRoom }: TelepathyProps) {
  const [choice, setChoice] = useState<'A' | 'B' | null>(null);
  const [timeLeft, setTimeLeft] = useState(5);
  const [results, setResults] = useState<any>(null);
  const [playerChoices, setPlayerChoices] = useState<{ [key: string]: 'A' | 'B' }>({});

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // 게임 시작
    const handleStarted = (data: {
      question: string;
      optionA: string;
      optionB: string;
      timeLimit: number;
    }) => {
      setTimeLeft(data.timeLimit);
      setChoice(null);
      setResults(null);
      setPlayerChoices({});

      // 타이머
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // 선택 수신
    const handleChosen = (data: { userId: string; choice: 'A' | 'B' }) => {
      setPlayerChoices((prev) => ({ ...prev, [data.userId]: data.choice }));
    };

    // 결과 수신
    const handleResults = (data: {
      success: boolean;
      choices: { [key: string]: 'A' | 'B' };
      traitor?: string;
    }) => {
      setResults(data);
    };

    socket.on('telepathy:started', handleStarted);
    socket.on('telepathy:chosen', handleChosen);
    socket.on('telepathy:results', handleResults);

    return () => {
      socket.off('telepathy:started', handleStarted);
      socket.off('telepathy:chosen', handleChosen);
      socket.off('telepathy:results', handleResults);
    };
  }, []);

  // 선택하기
  const handleChoose = (selectedChoice: 'A' | 'B') => {
    if (choice !== null || timeLeft <= 0) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('telepathy:choose', { choice: selectedChoice });
      setChoice(selectedChoice);
    }
  };

  // 다시하기 (호스트만)
  const handleRestart = () => {
    const socket = getSocket();
    if (socket && isHost) {
      socket.emit('game:start', {
        gameType: 'telepathy',
        settings: {
          question: gameData?.question || '당신의 선택은?',
          optionA: gameData?.optionA || 'A',
          optionB: gameData?.optionB || 'B',
        },
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 게임 화면 */}
        {!results && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-xl text-center">
            <h1 className="text-3xl font-bold text-gray-800">🧠 Telepathy</h1>
            <p className="text-lg text-gray-600">{gameData?.question || '당신의 선택은?'}</p>

            {/* 타이머 */}
            <div className="text-6xl font-bold text-purple-600">{timeLeft}</div>

            {/* 선택 버튼 */}
            {choice === null && timeLeft > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleChoose('A')}
                  className="rounded-xl bg-blue-500 px-6 py-8 text-2xl font-bold text-white transition-all hover:bg-blue-600 active:scale-95"
                >
                  {gameData?.optionA || 'A'}
                </button>
                <button
                  onClick={() => handleChoose('B')}
                  className="rounded-xl bg-red-500 px-6 py-8 text-2xl font-bold text-white transition-all hover:bg-red-600 active:scale-95"
                >
                  {gameData?.optionB || 'B'}
                </button>
              </div>
            )}

            {/* 선택 완료 */}
            {choice !== null && (
              <div className="rounded-xl bg-green-100 p-4">
                <p className="text-lg font-semibold text-green-800">
                  선택 완료: {choice === 'A' ? gameData?.optionA : gameData?.optionB}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  다른 플레이어를 기다리는 중...
                </p>
              </div>
            )}

            {/* 시간 종료 */}
            {timeLeft === 0 && choice === null && (
              <div className="rounded-xl bg-red-100 p-4">
                <p className="text-lg font-semibold text-red-800">시간 초과!</p>
              </div>
            )}
          </div>
        )}

        {/* 결과 화면 */}
        {results && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-xl">
            <h2 className="text-center text-2xl font-bold text-gray-800">결과</h2>

            {results.success ? (
              <div className="rounded-xl bg-green-100 p-6 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-2xl font-bold text-green-800">성공!</p>
                <p className="mt-2 text-lg text-gray-700">모두 같은 선택을 했습니다!</p>
                <p className="mt-4 text-3xl font-bold text-green-600">+10 유대감</p>
              </div>
            ) : (
              <div className="rounded-xl bg-red-100 p-6 text-center">
                <div className="text-6xl mb-4">💔</div>
                <p className="text-2xl font-bold text-red-800">실패!</p>
                <p className="mt-2 text-lg text-gray-700">선택이 달랐습니다</p>
                {results.traitor && (
                  <p className="mt-4 text-lg font-semibold text-red-600">
                    다른 선택을 한 사람이 있습니다
                  </p>
                )}
              </div>
            )}

            {/* 선택 현황 */}
            <div className="rounded-lg bg-gray-100 p-4">
              <h3 className="mb-2 font-semibold text-gray-800">선택 현황</h3>
              <div className="space-y-2">
                {Object.entries(results.choices).map(([userId, choice]) => (
                  <div key={userId} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">플레이어 {userId.slice(-4)}</span>
                    <span className="font-semibold">
                      {choice === 'A' ? gameData?.optionA : gameData?.optionB}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onBackToRoom}
              className="w-full rounded-xl bg-purple-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-purple-600 active:scale-95"
            >
              대기실로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


