'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Single Mode 게임 선택 페이지
export default function SingleModePage() {
  const router = useRouter();

  const games = [
    {
      id: 'shake-it',
      name: 'Shake it',
      description: '화면을 클릭해 병 터뜨리기',
      emoji: '🍾',
      color: 'from-yellow-400 to-orange-500',
    },
    {
      id: 'finger-radar',
      name: 'Finger Radar',
      description: '손가락으로 당첨자 찾기',
      emoji: '👆',
      color: 'from-blue-400 to-purple-500',
    },
    {
      id: 'marble-roulette',
      name: '마블 룰렛',
      description: '슬롯머신 스타일 룰렛 (이름*가중치)',
      emoji: '🎰',
      color: 'from-indigo-400 to-purple-500',
    },
    {
      id: 'spin-roulette',
      name: '랜덤 뽑기',
      description: '숫자 돌려서 당첨자 뽑기 (최대 20명)',
      emoji: '🎰',
      color: 'from-pink-400 to-red-500',
    },
  ];

  const handleGameSelect = (gameId: string) => {
    router.push(`/single/${gameId}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-purple-100 to-pink-100 p-4">
      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="rounded-full bg-white/80 px-4 py-2 text-lg font-semibold text-gray-700 shadow-md transition-all hover:bg-white"
        >
          ← 뒤로
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">혼자하기</h1>
        <div className="w-20"></div> {/* 공간 맞추기 */}
      </div>

      {/* 게임 목록 */}
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => handleGameSelect(game.id)}
            className={`w-full rounded-2xl bg-gradient-to-r ${game.color} p-6 text-left shadow-lg transition-all hover:scale-105 active:scale-95`}
          >
            <div className="flex items-center gap-4">
              <div className="text-5xl">{game.emoji}</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{game.name}</h2>
                <p className="text-white/90">{game.description}</p>
              </div>
              <div className="text-2xl text-white/80">→</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

