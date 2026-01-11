'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 가중치 룰렛 게임 컴포넌트 (마블 룰렛 스타일)
interface Participant {
  name: string;
  weight: number; // 가중치 (기본 1)
}

export default function WeightedRoulette() {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inputText, setInputText] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showSettings, setShowSettings] = useState(true);

  // 입력 파싱 (이름*가중치 형식 또는 이름만)
  const parseInput = (text: string): Participant[] => {
    const items = text.split(',').map((item) => item.trim()).filter(Boolean);
    const parsed: Participant[] = [];

    items.forEach((item) => {
      if (item.includes('*')) {
        const [name, weightStr] = item.split('*').map((s) => s.trim());
        const weight = parseInt(weightStr) || 1;
        if (name) {
          parsed.push({ name, weight: Math.max(1, weight) });
        }
      } else {
        parsed.push({ name: item, weight: 1 });
      }
    });

    return parsed;
  };

  // 참가자 추가
  const handleAddParticipants = () => {
    if (!inputText.trim()) return;

    const parsed = parseInput(inputText);
    if (parsed.length === 0) return;

    // 기존 참가자와 합치기 (중복 제거)
    const newParticipants = [...participants];
    parsed.forEach((newPart) => {
      const existingIndex = newParticipants.findIndex(
        (p) => p.name === newPart.name
      );
      if (existingIndex >= 0) {
        newParticipants[existingIndex].weight = newPart.weight;
      } else {
        newParticipants.push(newPart);
      }
    });

    setParticipants(newParticipants);
    setInputText('');
  };

  // 참가자 삭제
  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  // 가중치 변경
  const handleWeightChange = (index: number, newWeight: number) => {
    const updated = [...participants];
    updated[index].weight = Math.max(1, Math.min(100, newWeight));
    setParticipants(updated);
  };

  // 룰렛 돌리기
  const handleSpin = useCallback(() => {
    if (participants.length < 1 || spinning) return;

    setSpinning(true);
    setWinner(null);

    // 가중치 기반 당첨 확률 계산
    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    let selectedIndex = 0;
    for (let i = 0; i < participants.length; i++) {
      currentWeight += participants[i].weight;
      if (random <= currentWeight) {
        selectedIndex = i;
        break;
      }
    }

    // 회전 애니메이션 (5-10바퀴 + 랜덤)
    const spins = 5 + Math.random() * 5;
    const segmentAngle = 360 / participants.length;
    const targetAngle = selectedIndex * segmentAngle + segmentAngle / 2;
    const randomOffset = (Math.random() - 0.5) * segmentAngle * 0.8;
    const totalRotation = rotation + spins * 360 + (360 - targetAngle) + randomOffset;

    setRotation(totalRotation);

    // 회전 애니메이션 후 당첨자 결정
    setTimeout(() => {
      setWinner(participants[selectedIndex]);
      setSpinning(false);

      // 진동 피드백
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }, 3000);
  }, [participants, spinning, rotation]);

  // 다시하기
  const handleReset = () => {
    setParticipants([]);
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

  // 가중치에 따른 세그먼트 크기 계산
  const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
  const getSegmentAngle = (weight: number) => (weight / totalWeight) * 360;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 p-4">
      {showSettings ? (
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-center text-3xl font-bold text-gray-800">🎰 가중치 룰렛</h1>
          <p className="text-center text-sm text-gray-600">
            이름만 입력하거나 이름*가중치 형식으로 입력하세요
            <br />
            예: 짱구*5, 짱아*10, 봉미선*3
          </p>

          {/* 참가자 입력 */}
          <div className="space-y-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && e.ctrlKey && handleAddParticipants()}
              placeholder="이름 입력 (쉼표로 구분)&#10;예: 짱구*5, 짱아*10, 봉미선*3"
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none"
              rows={3}
            />
            <button
              onClick={handleAddParticipants}
              disabled={!inputText.trim()}
              className="w-full rounded-lg bg-purple-500 px-6 py-2 font-bold text-white transition-all hover:bg-purple-600 disabled:bg-gray-300"
            >
              추가 (Ctrl+Enter)
            </button>
          </div>

          {/* 참가자 목록 */}
          {participants.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              <div className="text-sm font-semibold text-gray-700">참가자 목록</div>
              {participants.map((participant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 p-3"
                >
                  <div
                    className="h-6 w-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{participant.name}</div>
                    <div className="text-xs text-gray-500">
                      확률: {((participant.weight / totalWeight) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleWeightChange(index, participant.weight - 1)}
                      className="h-6 w-6 rounded bg-gray-300 text-sm font-bold hover:bg-gray-400"
                      disabled={participant.weight <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={participant.weight}
                      onChange={(e) => handleWeightChange(index, parseInt(e.target.value) || 1)}
                      min="1"
                      max="100"
                      className="w-12 rounded border border-gray-300 px-1 text-center text-sm"
                    />
                    <button
                      onClick={() => handleWeightChange(index, participant.weight + 1)}
                      className="h-6 w-6 rounded bg-gray-300 text-sm font-bold hover:bg-gray-400"
                      disabled={participant.weight >= 100}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(index)}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 시작 버튼 */}
          {participants.length >= 1 && (
            <button
              onClick={() => setShowSettings(false)}
              className="w-full rounded-xl bg-purple-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-purple-600 active:scale-95"
            >
              룰렛 시작 ({participants.length}명)
            </button>
          )}
        </div>
      ) : (
        <div className="w-full max-w-2xl space-y-6 text-center">
          {/* 룰렛 */}
          <div className="relative mx-auto aspect-square w-full max-w-lg">
            <div
              className="relative h-full w-full rounded-full border-8 border-gray-800 shadow-2xl transition-transform duration-[3000ms] ease-out"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {participants.map((participant, index) => {
                let startAngle = 0;
                for (let i = 0; i < index; i++) {
                  startAngle += getSegmentAngle(participants[i].weight);
                }
                const segmentAngle = getSegmentAngle(participant.weight);

                return (
                  <div
                    key={index}
                    className="absolute left-1/2 top-1/2 origin-bottom"
                    style={{
                      transform: `translate(-50%, -100%) rotate(${startAngle}deg)`,
                      transformOrigin: '50% 100%',
                      width: '50%',
                      height: '50%',
                    }}
                  >
                    <div
                      className="h-full w-full relative"
                      style={{
                        backgroundColor: colors[index % colors.length],
                        clipPath: `polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)`,
                        transform: `rotate(${segmentAngle / 2}deg)`,
                        transformOrigin: '50% 100%',
                      }}
                    >
                      <div
                        className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-bold text-white"
                        style={{
                          transform: `rotate(${-segmentAngle / 2}deg)`,
                          writingMode: segmentAngle < 30 ? 'vertical-rl' : 'horizontal-tb',
                        }}
                      >
                        <div className="text-center">
                          <div className="truncate max-w-[60px]">{participant.name}</div>
                          {segmentAngle > 20 && (
                            <div className="text-[10px] opacity-80">x{participant.weight}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 화살표 */}
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-2">
              <div className="text-5xl drop-shadow-lg">▼</div>
            </div>
          </div>

          {/* 참가자 정보 */}
          <div className="rounded-xl bg-white p-4 shadow-lg">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 md:grid-cols-4">
              {participants.map((participant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 p-2"
                >
                  <div
                    className="h-4 w-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs truncate">{participant.name}</div>
                    <div className="text-[10px] text-gray-500">x{participant.weight}</div>
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
            <div className="text-2xl font-bold text-gray-700">돌아가는 중...</div>
          )}

          {winner && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-yellow-100 to-orange-100 p-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-yellow-800">당첨!</h2>
                <p className="mt-4 text-4xl font-bold text-gray-900">{winner.name}</p>
                <p className="mt-2 text-lg text-gray-600">
                  가중치: {winner.weight} (확률: {((winner.weight / totalWeight) * 100).toFixed(1)}%)
                </p>
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


