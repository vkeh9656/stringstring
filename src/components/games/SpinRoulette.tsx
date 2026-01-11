'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// 즉석 랜덤 뽑기 게임 컴포넌트
export default function SpinRoulette() {
  const router = useRouter();
  const [numPlayers, setNumPlayers] = useState(4);
  const [showSettings, setShowSettings] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayNumber, setDisplayNumber] = useState(1);
  const [winner, setWinner] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 색상 배열
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
    '#FF69B4', '#32CD32', '#FFD700', '#FF4500', '#9370DB', '#20B2AA',
    '#FF6347', '#4169E1'
  ];

  // 게임 시작
  const handleStart = () => {
    setShowSettings(false);
    setWinner(null);
    setDisplayNumber(1);
  };

  // 랜덤 뽑기 실행
  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWinner(null);

    // 미리 당첨자 선택
    const winnerNum = Math.floor(Math.random() * numPlayers) + 1;
    
    let count = 0;
    const totalSpins = 30 + Math.floor(Math.random() * 20); // 30~50회 돌기
    
    // 빠르게 숫자 돌리기
    intervalRef.current = setInterval(() => {
      count++;
      
      // 랜덤 숫자 표시 (점점 느려짐)
      const randomNum = Math.floor(Math.random() * numPlayers) + 1;
      setDisplayNumber(randomNum);
      
      // 속도 조절 (마지막에 느려짐)
      if (count >= totalSpins - 10) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        // 마지막 슬로우다운
        let slowCount = 0;
        const slowDown = () => {
          slowCount++;
          const slowRandom = Math.floor(Math.random() * numPlayers) + 1;
          setDisplayNumber(slowRandom);
          
          if (slowCount < 10) {
            setTimeout(slowDown, 100 + slowCount * 50); // 점점 느려짐
          } else {
            // 최종 결과
            setDisplayNumber(winnerNum);
            setWinner(winnerNum);
            setIsSpinning(false);
            
            // 진동 피드백
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }
        };
        slowDown();
      }
    }, 50);
  };

  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 다시하기
  const handleReset = () => {
    setShowSettings(true);
    setWinner(null);
    setDisplayNumber(1);
    setIsSpinning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // 다시 뽑기
  const handleRespin = () => {
    setWinner(null);
    handleSpin();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-purple-100 to-pink-100 p-3 overflow-hidden">
      <div className="flex flex-col h-full max-w-md mx-auto w-full">
        {/* 설정 화면 */}
        {showSettings && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full space-y-4 rounded-2xl bg-white p-6 shadow-xl">
              <h1 className="text-center text-2xl font-bold text-gray-800">🎰 랜덤 뽑기</h1>
              <p className="text-center text-sm text-gray-600">참가자 수를 선택하세요</p>

              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{numPlayers}명</div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={numPlayers}
                    onChange={(e) => setNumPlayers(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>2명</span>
                    <span>20명</span>
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  className="w-full rounded-xl bg-purple-500 px-4 py-3 text-base font-bold text-white transition-all hover:bg-purple-600 active:scale-95"
                >
                  시작하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 게임 화면 */}
        {!showSettings && (
          <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="text-center mb-4 flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-800">🎰 랜덤 뽑기</h1>
              <p className="text-sm text-gray-600">1 ~ {numPlayers} 중에서 뽑기</p>
            </div>

            {/* 숫자 표시 영역 */}
            <div className="flex-1 flex items-center justify-center">
              <div 
                className={`relative w-48 h-48 rounded-3xl shadow-2xl flex items-center justify-center transition-all duration-100 ${
                  winner !== null ? 'animate-bounce' : ''
                }`}
                style={{ 
                  backgroundColor: colors[(displayNumber - 1) % colors.length],
                  transform: isSpinning ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                {/* 숫자 */}
                <span 
                  className="text-8xl font-bold text-white drop-shadow-lg"
                  style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}
                >
                  {displayNumber}
                </span>

                {/* 당첨 효과 */}
                {winner !== null && (
                  <>
                    <div className="absolute -top-4 -left-4 text-4xl animate-ping">✨</div>
                    <div className="absolute -top-4 -right-4 text-4xl animate-ping" style={{ animationDelay: '0.2s' }}>✨</div>
                    <div className="absolute -bottom-4 -left-4 text-4xl animate-ping" style={{ animationDelay: '0.4s' }}>✨</div>
                    <div className="absolute -bottom-4 -right-4 text-4xl animate-ping" style={{ animationDelay: '0.6s' }}>✨</div>
                  </>
                )}
              </div>
            </div>

            {/* 결과 텍스트 */}
            {winner !== null && (
              <div className="text-center mb-4 flex-shrink-0">
                <p className="text-2xl font-bold text-purple-600 animate-pulse">
                  🎉 {winner}번 당첨! 🎉
                </p>
              </div>
            )}

            {/* 버튼 */}
            <div className="space-y-2 flex-shrink-0 pb-2">
              {winner === null && (
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className={`w-full rounded-xl px-4 py-4 text-lg font-bold text-white transition-all active:scale-95 ${
                    isSpinning 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-red-500 hover:bg-red-600 animate-pulse'
                  }`}
                >
                  {isSpinning ? '🎲 뽑는 중...' : '🎯 뽑기!'}
                </button>
              )}

              {winner !== null && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRespin}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-base font-bold text-white transition-all hover:bg-red-600 active:scale-95"
                  >
                    다시 뽑기
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 rounded-xl bg-gray-500 px-4 py-3 text-base font-bold text-white transition-all hover:bg-gray-600 active:scale-95"
                  >
                    인원 변경
                  </button>
                </div>
              )}

              <button
                onClick={() => router.push('/single')}
                className="w-full rounded-xl bg-gray-400 px-4 py-3 text-base font-bold text-white transition-all hover:bg-gray-500 active:scale-95"
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
