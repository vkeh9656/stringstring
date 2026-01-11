'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShakeItSettings } from '@/types/game';

// Shake it 게임 컴포넌트
export default function ShakeIt() {
  const router = useRouter();
  const [settings, setSettings] = useState<ShakeItSettings | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [bottleScale, setBottleScale] = useState(1);
  const [bubbles, setBubbles] = useState(0);
  const [exploded, setExploded] = useState(false);
  const [vibrating, setVibrating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // 터치 중복 방지

  // 설정 완료 - 최소 20회 ~ 최대 50회 랜덤
  const handleStart = () => {
    // 20 ~ 50 사이 랜덤 값
    const totalLimit = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
    
    setSettings({
      sensitivity: 'random',
      totalLimit,
      currentCount: 0,
    });
    setShowSettings(false);
  };

  // 터치/클릭 처리 (100ms 딜레이로 중복 방지)
  const handleTouch = useCallback(() => {
    if (!settings || exploded || isProcessing) return;

    setIsProcessing(true);

    // 100ms 딜레이 후 처리
    setTimeout(() => {
      if (!settings || exploded) {
        setIsProcessing(false);
        return;
      }

      const newCount = settings.currentCount + 1;
      const progress = newCount / settings.totalLimit;

      // 병 크기 증가 (최대 1.5배)
      setBottleScale(1 + progress * 0.5);
      setBubbles((prev) => prev + 1);

      // 진동 피드백
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setVibrating(true);
      setTimeout(() => setVibrating(false), 100);

      // 폭발 체크
      if (newCount >= settings.totalLimit) {
        setExploded(true);
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        // 폭발 사운드 효과
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGW47+efTQ8MT6fj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBhluO/nn00PDE+n4/C2YxwGOJHX8sx5LAUkd8fw3ZBAC');
        audio.play().catch(() => {});
      }

      setSettings({ ...settings, currentCount: newCount });
      setIsProcessing(false);
    }, 100);
  }, [settings, exploded, isProcessing]);

  // 다시하기
  const handleReset = () => {
    setSettings(null);
    setShowSettings(true);
    setBottleScale(1);
    setBubbles(0);
    setExploded(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-yellow-100 to-orange-100 p-3 overflow-hidden">
      <div className="flex flex-col h-full max-w-md mx-auto w-full">
        {/* 설정 화면 */}
        {showSettings && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full space-y-4 rounded-2xl bg-white p-6 shadow-xl">
              <h1 className="text-center text-2xl font-bold text-gray-800">🍾 Shake it</h1>
              <p className="text-center text-sm text-gray-600">화면을 클릭해 병을 터뜨리세요!</p>
              
              <button
                onClick={handleStart}
                className="w-full rounded-xl bg-yellow-500 px-4 py-3 text-base font-bold text-white transition-all hover:bg-yellow-600 active:scale-95"
              >
                게임 시작
              </button>
            </div>
          </div>
        )}

        {/* 게임 화면 */}
        {!showSettings && !exploded && (
          <div 
            className="flex-1 flex flex-col items-center justify-center"
            onClick={handleTouch}
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouch();
            }}
          >
            <div
              className={`relative transition-all ${vibrating ? 'animate-pulse' : ''}`}
              style={{ transform: `scale(${bottleScale})` }}
            >
              <div className="text-8xl">🍾</div>
              {bubbles > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {Array.from({ length: Math.min(bubbles, 10) }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute animate-bounce text-xl opacity-70"
                      style={{
                        left: `${20 + i * 8}%`,
                        top: `${30 + (i % 3) * 10}%`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    >
                      💨
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-4 text-base text-gray-600">화면을 터치하세요!</p>
          </div>
        )}

        {/* 폭발 화면 */}
        {exploded && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-8xl animate-bounce">💥</div>
            <h2 className="text-3xl font-bold text-red-600 mt-4">POP!</h2>
            <p className="text-lg text-gray-700 mb-6">병이 터졌습니다!</p>
            
            <div className="w-full flex gap-2 px-4">
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-base font-bold text-white transition-all hover:bg-blue-600 active:scale-95"
              >
                다시하기
              </button>
              <button
                onClick={() => router.push('/single')}
                className="flex-1 rounded-xl bg-gray-500 px-4 py-3 text-base font-bold text-white transition-all hover:bg-gray-600 active:scale-95"
              >
                다른 게임
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

