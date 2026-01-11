'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TouchPoint } from '@/types/game';

// Finger Radar 게임 컴포넌트
export default function FingerRadar() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null); // 3, 2, 1, null
  const [scanning, setScanning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [gamePhase, setGamePhase] = useState<'ready' | 'countdown' | 'display' | 'scanning' | 'result'>('ready');

  // 터치 위치 실시간 추적 (카운트다운 중)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gamePhase !== 'countdown') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const touches: TouchPoint[] = [];
    
    for (let i = 0; i < e.touches.length && i < 20; i++) {
      const touch = e.touches[i];
      touches.push({
        id: touch.identifier,
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
    
    setTouchPoints(touches);
  }, [gamePhase]);

  // 터치 종료
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (gamePhase !== 'countdown') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const touches: TouchPoint[] = [];
    
    for (let i = 0; i < e.touches.length && i < 20; i++) {
      const touch = e.touches[i];
      touches.push({
        id: touch.identifier,
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
    
    setTouchPoints(touches);
  }, [gamePhase]);

  // 터치 이동
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (gamePhase !== 'countdown') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const touches: TouchPoint[] = [];
    
    for (let i = 0; i < e.touches.length && i < 20; i++) {
      const touch = e.touches[i];
      touches.push({
        id: touch.identifier,
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
    
    setTouchPoints(touches);
  }, [gamePhase]);

  // ON 버튼 클릭 - 카운트다운 시작
  const handleStart = () => {
    setGamePhase('countdown');
    setTouchPoints([]);
    setSelectedIndex(null);
    
    // 3초 카운트다운
    setCountdown(3);
    
    setTimeout(() => setCountdown(2), 1000);
    setTimeout(() => setCountdown(1), 2000);
    setTimeout(() => {
      setCountdown(null);
      // 카운트다운 끝 - 현재 터치된 위치로 아이콘 고정하고 스캔 대기
      setGamePhase('display');
    }, 3000);
  };

  // 스캔 시작 버튼 클릭
  const handleStartScan = () => {
    if (touchPoints.length === 0) {
      alert('터치가 감지되지 않았습니다. 다시 시도해주세요!');
      handleReset();
      return;
    }
    
    setGamePhase('scanning');
    setScanning(true);
    
    // 2초 후 결과 표시
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * touchPoints.length);
      setSelectedIndex(randomIndex);
      setScanning(false);
      setGamePhase('result');
      
      // 진동 피드백
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }, 2000);
  };

  // 다시하기
  const handleReset = () => {
    setTouchPoints([]);
    setCountdown(null);
    setScanning(false);
    setSelectedIndex(null);
    setGamePhase('ready');
  };

  // 귀여운 동물 아이콘 배열
  const characterIcons = ['🐱', '🐶', '🐰', '🐻', '🐼', '🐨', '🦊', '🐷', '🐸', '🐯', '🦁', '🐮', '🐹', '🐭', '🐵', '🦄', '🐲', '🦋', '🐞', '🐙'];

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-blue-100 to-purple-100 p-3 overflow-hidden">
      <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
        {/* 헤더 */}
        <div className="text-center mb-2 flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-800">👆 Finger Radar</h1>
          <p className="text-sm text-gray-600">
            {gamePhase === 'ready' && '버튼을 누르고 손가락을 올려주세요'}
            {gamePhase === 'countdown' && '손가락을 화면에 올려주세요!'}
            {gamePhase === 'display' && '스캔 시작 버튼을 눌러주세요'}
            {gamePhase === 'scanning' && '스캔 중...'}
            {gamePhase === 'result' && '결과 발표!'}
          </p>
        </div>

        {/* 터치 영역 */}
        <div
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          className="relative w-full rounded-2xl bg-white shadow-xl mb-3 flex-1 min-h-0"
          style={{ touchAction: 'none' }}
        >
          {/* 카운트다운 표시 */}
          {gamePhase === 'countdown' && countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-9xl font-bold text-purple-500 animate-pulse drop-shadow-lg">
                {countdown}
              </div>
            </div>
          )}

          {/* 스캔 애니메이션 */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-6xl animate-spin">🔍</div>
              <div className="absolute text-2xl font-bold text-gray-700 mt-24">Scanning...</div>
            </div>
          )}

          {/* 터치 포인트 표시 - 카운트다운 중에는 점만, 이후에는 아이콘 */}
          {touchPoints.map((point, index) => {
            const characterIcon = characterIcons[index % characterIcons.length];
            return (
              <div
                key={point.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: point.x, top: point.y }}
              >
                {/* 카운트다운 중 - 점만 표시 */}
                {gamePhase === 'countdown' && (
                  <div className="w-6 h-6 rounded-full bg-purple-400 animate-pulse shadow-lg" />
                )}

                {/* 아이콘 표시 대기 & 스캔 중 - 아이콘과 번호 표시 */}
                {(gamePhase === 'display' || gamePhase === 'scanning') && (
                  <div className="flex flex-col items-center">
                    <div className="text-4xl drop-shadow-lg">{characterIcon}</div>
                    <div className="mt-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                      {index + 1}
                    </div>
                  </div>
                )}

                {/* 결과 - 당첨자 표시 */}
                {gamePhase === 'result' && selectedIndex === index && (
                  <div className="flex flex-col items-center">
                    <div className="text-5xl animate-bounce drop-shadow-lg">{characterIcon}</div>
                    <div className="mt-2 rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg">
                      당첨!
                    </div>
                  </div>
                )}

                {/* 결과 - 비당첨자 표시 */}
                {gamePhase === 'result' && selectedIndex !== index && (
                  <div className="flex flex-col items-center opacity-50">
                    <div className="text-3xl">{characterIcon}</div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 안내 문구 */}
          {gamePhase === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl text-gray-400 mb-2">아래 버튼을 눌러 시작하세요</p>
              <p className="text-sm text-gray-300">최대 20명까지 참여 가능</p>
            </div>
          )}

          {/* 결과 - 터치가 없었을 때 */}
          {gamePhase === 'result' && touchPoints.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl text-gray-400 mb-2">터치가 감지되지 않았습니다</p>
              <p className="text-sm text-gray-300">다시 시도해주세요</p>
            </div>
          )}
        </div>

        {/* 버튼 - 하단 고정 */}
        <div className="space-y-2 flex-shrink-0 pb-2">
          {gamePhase === 'ready' && (
            <button
              onClick={handleStart}
              className="w-full rounded-xl bg-purple-500 px-4 py-3 text-base font-bold text-white transition-all hover:bg-purple-600 active:scale-95"
            >
              🎯 Finger Radar ON
            </button>
          )}

          {gamePhase === 'countdown' && (
            <button
              disabled
              className="w-full rounded-xl bg-gray-400 px-4 py-3 text-base font-bold text-white cursor-not-allowed"
            >
              손가락을 올려주세요... ({countdown})
            </button>
          )}

          {gamePhase === 'display' && (
            <div className="flex gap-2">
              <button
                onClick={handleStartScan}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-base font-bold text-white transition-all hover:bg-red-600 active:scale-95 animate-pulse"
              >
                🔍 스캔 시작 ({touchPoints.length}명)
              </button>
              <button
                onClick={handleReset}
                className="rounded-xl bg-gray-400 px-4 py-3 text-base font-bold text-white transition-all hover:bg-gray-500 active:scale-95"
              >
                🔄
              </button>
            </div>
          )}

          {gamePhase === 'scanning' && (
            <button
              disabled
              className="w-full rounded-xl bg-gray-400 px-4 py-3 text-base font-bold text-white cursor-not-allowed"
            >
              스캔 중... ({touchPoints.length}명)
            </button>
          )}

          {gamePhase === 'result' && (
            <div className="flex gap-2">
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
          )}
        </div>
      </div>
    </div>
  );
}
