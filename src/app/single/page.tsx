'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Single Mode 게임 선택 페이지
export default function SingleModePage() {
  const router = useRouter();

  const games = [
    {
      id: 'shake-it',
      name: '병 터뜨리기',
      description: '화면을 클릭해 병 터뜨리기',
      emoji: '🍾',
      color: 'from-yellow-400 to-orange-500',
    },
    {
      id: 'finger-radar',
      name: '손가락 레이더',
      description: '화면에 닿은 손가락으로\n당첨자 찾기',
      emoji: '👆',
      color: 'from-blue-400 to-purple-500',
    },
    {
      id: 'marble-roulette',
      name: '마블 룰렛',
      description: '구슬 레이싱 (최대 50명)',
      emoji: '🔮',
      color: 'from-indigo-400 to-purple-500',
    },
    {
      id: 'spin-roulette',
      name: '랜덤 숫자 뽑기',
      description: '당첨자 뽑기 (최대 20명)',
      emoji: '🎰',
      color: 'from-pink-400 to-red-500',
    },
    {
      id: 'small-talk-card',
      name: '스몰톡 카드',
      description: '질문이 담긴 카드',
      emoji: '💬',
      color: 'from-green-400 to-teal-500',
    },
  ];

  const handleGameSelect = (gameId: string) => {
    router.push(`/single/${gameId}`);
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-purple-100 to-pink-100 p-3 sm:p-4 overflow-hidden">
      {/* 헤더 */}
      <div className="flex-shrink-0 mb-3 sm:mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="rounded-full bg-white/80 px-3 py-1.5 sm:px-4 sm:py-2 text-base sm:text-lg font-semibold text-gray-700 shadow-md transition-all hover:bg-white"
        >
          ← 뒤로
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Single Mode</h1>
        <div className="w-16 sm:w-20"></div> {/* 공간 맞추기 */}
      </div>

      {/* 게임 목록 - 반응형 높이 조절 */}
      <div className="flex-1 mx-auto w-full max-w-2xl space-y-2 sm:space-y-3 overflow-y-auto">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => handleGameSelect(game.id)}
            className={`w-full rounded-xl sm:rounded-2xl bg-gradient-to-r ${game.color} p-3 sm:p-4 md:p-5 text-left shadow-lg transition-all hover:scale-105 active:scale-95`}
          >
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="text-3xl sm:text-4xl md:text-5xl flex-shrink-0">{game.emoji}</div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">{game.name}</h2>
                <p className="text-xs sm:text-sm md:text-base text-white/90 line-clamp-1">{game.description}</p>
              </div>
              <div className="text-xl sm:text-2xl text-white/80 flex-shrink-0">→</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

