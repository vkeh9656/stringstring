'use client';

import { useParams } from 'next/navigation';
import ShakeIt from '@/components/games/ShakeIt';
import FingerRadar from '@/components/games/FingerRadar';
import MarbleRoulette from '@/components/games/MarbleRoulette';
import SpinRoulette from '@/components/games/SpinRoulette';
import SmallTalkCard from '@/components/games/SmallTalkCard';
import WeightedRoulette from '@/components/games/WeightedRoulette';

// Single Mode 게임 페이지 (동적 라우팅)
export default function SingleGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;

  const renderGame = () => {
    switch (gameId) {
      case 'shake-it':
        return <ShakeIt />;
      case 'finger-radar':
        return <FingerRadar />;
      case 'marble-roulette':
        return <MarbleRoulette />;
      case 'spin-roulette':
        return <SpinRoulette />;
      case 'small-talk-card':
        return <SmallTalkCard />;
      case 'food-roulette':
        return <WeightedRoulette />;
      default:
        return (
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-xl text-gray-600">게임을 찾을 수 없습니다.</p>
          </div>
        );
    }
  };

  return renderGame();
}

