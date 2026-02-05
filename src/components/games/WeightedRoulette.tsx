'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 음식 룰렛 컴포넌트 (균등 분할)
// 한국인이 좋아하는 음식 Top 10 (기본 세팅)
const DEFAULT_FOODS: string[] = [
  '치킨', '피자', '삼겹살', '라면', '초밥',
  '떡볶이', '햄버거', '파스타', '김밥', '비빔밥',
];

export default function WeightedRoulette() {
  const router = useRouter();
  const [items, setItems] = useState<string[]>(DEFAULT_FOODS);
  const [inputText, setInputText] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showSettings, setShowSettings] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  // 입력 파싱 (쉼표로 구분)
  const parseInput = (text: string): string[] => {
    return text.split(',').map((item) => item.trim()).filter(Boolean);
  };

  // 항목 추가
  const handleAddItems = () => {
    if (!inputText.trim()) return;

    const parsed = parseInput(inputText);
    if (parsed.length === 0) return;

    // 기존 항목과 합치기 (중복 제거)
    const newItems = [...items];
    parsed.forEach((newItem) => {
      if (!newItems.includes(newItem)) {
        newItems.push(newItem);
      }
    });

    setItems(newItems);
    setInputText('');
  };

  // 항목 삭제
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // 이름 편집 시작
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingName(items[index]);
  };

  // 이름 편집 완료
  const handleFinishEdit = (index: number) => {
    if (editingName.trim()) {
      const updated = [...items];
      updated[index] = editingName.trim();
      setItems(updated);
    }
    setEditingIndex(null);
    setEditingName('');
  };

  // 이름 편집 취소
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingName('');
  };

  // 균등 분할 각도 계산
  const segmentAngle = items.length > 0 ? 360 / items.length : 360;

  // 룰렛 돌리기
  const handleSpin = useCallback(() => {
    if (items.length < 1 || spinning) return;

    setSpinning(true);
    setWinner(null);

    // 회전 애니메이션 (5-10바퀴 + 랜덤 각도)
    const spins = 5 + Math.random() * 5;
    const randomAngle = Math.random() * 360;
    const totalRotation = rotation + spins * 360 + randomAngle;

    setRotation(totalRotation);

    // 회전 애니메이션 후 화살표가 가리키는 세그먼트를 당첨자로 결정
    setTimeout(() => {
      // 최종 회전 각도를 0-360 범위로 정규화
      const normalizedRotation = totalRotation % 360;
      
      // 화살표는 12시 방향(상단)에 고정
      // 룰렛이 시계방향으로 회전하므로, 화살표가 가리키는 세그먼트 계산
      // 세그먼트는 12시 방향(0도)에서 시계방향으로 배치됨
      const pointerAngle = (360 - normalizedRotation + 360) % 360;
      const winnerIndex = Math.floor(pointerAngle / segmentAngle) % items.length;
      
      setWinner(items[winnerIndex]);
      setSpinning(false);

      // 진동 피드백
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }, 3000);
  }, [items, spinning, rotation, segmentAngle]);

  // 다시하기
  const handleReset = () => {
    setItems([]);
    setWinner(null);
    setRotation(0);
    setShowSettings(true);
  };

  // 색상 배열
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#E74C3C', '#3498DB', '#2ECC71',
    '#9B59B6', '#1ABC9C', '#F39C12', '#E67E22',
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 p-4">
      {showSettings ? (
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-center text-3xl font-bold text-black">🍕 음식 룰렛</h1>
          <p className="text-center text-sm text-black">
            쉼표로 구분하여 음식을 입력하세요
            <br />
            예: 치킨, 피자, 짜장면
          </p>

          {/* 항목 입력 */}
          <div className="space-y-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && e.ctrlKey && handleAddItems()}
              placeholder={`음식 입력 (쉼표로 구분)\n예: 치킨, 피자, 짜장면`}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none"
              rows={2}
            />
            <button
              onClick={handleAddItems}
              disabled={!inputText.trim()}
              className="w-full rounded-lg bg-purple-500 px-6 py-2 font-bold text-white transition-all hover:bg-purple-600 disabled:bg-gray-300"
            >
              추가 (Ctrl+Enter)
            </button>
          </div>

          {/* 항목 목록 */}
          {items.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              <div className="text-sm font-semibold text-black">
                음식 목록 ({items.length}개) - 각 {(100 / items.length).toFixed(1)}% 확률
              </div>
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 p-3"
                >
                  <div
                    className="h-6 w-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleFinishEdit(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFinishEdit(index);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                        className="w-full rounded border border-purple-500 px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <div 
                        className="font-semibold truncate cursor-pointer hover:text-purple-600"
                        onClick={() => handleStartEdit(index)}
                        title="클릭하여 이름 수정"
                      >
                        {item}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 flex-shrink-0 px-2 py-1 rounded hover:bg-red-50 transition-all"
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 시작 버튼 */}
          {items.length >= 2 && (
            <button
              onClick={() => setShowSettings(false)}
              className="w-full rounded-xl bg-purple-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-purple-600 active:scale-95"
            >
              룰렛 시작 ({items.length}개)
            </button>
          )}
          
          {items.length === 1 && (
            <p className="text-center text-sm text-red-500">최소 2개 이상 입력해주세요</p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-2xl space-y-6 text-center">
          {/* 룰렛 */}
          <div className="relative mx-auto w-full max-w-lg">
            {/* 화살표 (상단 고정) */}
            <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-2">
              <div className="text-5xl drop-shadow-lg">▼</div>
            </div>
            
            {/* SVG 룰렛 */}
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full drop-shadow-2xl transition-transform duration-[3000ms] ease-out"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {/* 외곽 원 */}
              <circle cx="200" cy="200" r="195" fill="none" stroke="#1f2937" strokeWidth="10" />
              
              {/* 파이 세그먼트 (균등 분할) */}
              {items.map((item, index) => {
                // 각 세그먼트의 시작/끝 각도 (12시 방향에서 시작)
                const startAngle = -90 + index * segmentAngle;
                const endAngle = startAngle + segmentAngle;
                
                // SVG arc path 계산
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                
                const x1 = 200 + 190 * Math.cos(startRad);
                const y1 = 200 + 190 * Math.sin(startRad);
                const x2 = 200 + 190 * Math.cos(endRad);
                const y2 = 200 + 190 * Math.sin(endRad);
                
                const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                
                const pathD = `M 200 200 L ${x1} ${y1} A 190 190 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                
                // 텍스트 위치 계산 (세그먼트 중앙)
                const midAngle = startAngle + segmentAngle / 2;
                const midRad = (midAngle * Math.PI) / 180;
                const textRadius = 120;
                const textX = 200 + textRadius * Math.cos(midRad);
                const textY = 200 + textRadius * Math.sin(midRad);
                
                return (
                  <g key={index}>
                    {/* 파이 세그먼트 */}
                    <path
                      d={pathD}
                      fill={colors[index % colors.length]}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    {/* 텍스트 */}
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#000"
                      fontSize={items.length > 10 ? "10" : items.length > 6 ? "12" : "14"}
                      fontWeight="bold"
                      style={{
                        textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                      }}
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    >
                      {item.length > 6 ? item.slice(0, 6) + '...' : item}
                    </text>
                  </g>
                );
              })}
              
              {/* 중심 원 */}
              <circle cx="200" cy="200" r="25" fill="#1f2937" />
              <circle cx="200" cy="200" r="20" fill="#fff" />
            </svg>
          </div>

          {/* 항목 정보 */}
          <div className="rounded-xl bg-white p-4 shadow-lg">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 md:grid-cols-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 p-2"
                >
                  <div
                    className="h-4 w-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs truncate text-black">{item}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 버튼 */}
          {!spinning && !winner && (
            <button
              onClick={handleSpin}
              className="w-full rounded-xl bg-purple-500 px-6 py-4 text-2xl font-bold text-white transition-all hover:bg-purple-600 active:scale-95"
            >
              🎰 돌리기!
            </button>
          )}

          {spinning && (
            <div className="text-2xl font-bold text-black">돌아가는 중...</div>
          )}

          {winner && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-yellow-100 to-orange-100 p-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-yellow-800">당첨!</h2>
                <p className="mt-4 text-4xl font-bold text-gray-900">{winner}</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSpin}
                  className="w-full rounded-xl bg-purple-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-purple-600 active:scale-95"
                >
                  다시 돌리기
                </button>
                <button
                  onClick={handleReset}
                  className="w-full rounded-xl bg-gray-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-gray-600 active:scale-95"
                >
                  처음부터
                </button>
                <button
                  onClick={() => router.push('/single')}
                  className="w-full rounded-xl bg-gray-300 px-6 py-4 text-lg font-bold text-gray-700 transition-all hover:bg-gray-400 active:scale-95"
                >
                  다른 게임
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
