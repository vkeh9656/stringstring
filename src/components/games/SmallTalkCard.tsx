'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 아이스브레이킹 주제 데이터
const LIGHT_TOPICS = [
  '가장 좋아하는 음식은 무엇인가요?',
  '여행 가고 싶은 곳은 어디인가요?',
  '최근 본 영화 중 인상 깊었던 것은?',
  '취미는 무엇인가요?',
  '가장 좋아하는 계절은?',
  '어릴 때 꿈은 무엇이었나요?',
  '최근에 웃었던 일은?',
  '가장 좋아하는 색깔은?',
  '좋아하는 음악 장르는?',
  '가장 좋아하는 동물은?',
  '좋아하는 운동이나 활동은?',
  '가장 좋아하는 음료는?',
  '주말에 주로 무엇을 하나요?',
  '좋아하는 드라마나 예능 프로그램은?',
  '가장 좋아하는 디저트는?',
  '좋아하는 계절 음식은?',
  '가장 좋아하는 카페 메뉴는?',
  '좋아하는 향은?',
  '가장 좋아하는 과일은?',
  '좋아하는 패션 스타일은?',
  '가장 좋아하는 앱은?',
  '좋아하는 게임 장르는?',
  '가장 좋아하는 책 장르는?',
  '좋아하는 날씨는?',
  '가장 좋아하는 시간대는?',
];

const DEEP_TOPICS = [
  '인생에서 가장 중요한 가치는 무엇인가요?',
  '가장 기억에 남는 순간은 언제인가요?',
  '어떤 사람이 되고 싶나요?',
  '가장 감사한 사람은 누구인가요?',
  '인생의 목표는 무엇인가요?',
  '가장 어려웠던 시기는 언제였나요?',
  '성장하게 만든 경험은 무엇인가요?',
  '행복하다고 느끼는 순간은?',
  '가장 소중한 것은 무엇인가요?',
  '미래에 하고 싶은 일은?',
  '인생에서 배운 가장 큰 교훈은?',
  '가장 후회되는 일은?',
  '가장 자랑스러운 순간은?',
  '어려움을 극복한 경험이 있다면?',
  '가장 감동받았던 일은?',
  '인생의 전환점이 된 사건은?',
  '가장 힘들었지만 극복한 경험은?',
  '가장 기쁘게 생각하는 것은?',
  '인생에서 가장 중요한 결정은?',
  '가장 감사하게 생각하는 것은?',
  '어떤 가치관을 가지고 계신가요?',
  '가장 소중하게 여기는 관계는?',
  '인생에서 가장 배우고 싶은 것은?',
  '가장 존경하는 사람은?',
  '인생의 의미는 무엇이라고 생각하시나요?',
];

type TopicType = 'light' | 'deep';

// 스몰톡 카드 게임 컴포넌트
export default function SmallTalkCard() {
  const router = useRouter();
  const [topicType, setTopicType] = useState<TopicType | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [usedTopics, setUsedTopics] = useState<Set<string>>(new Set());

  // 주제 타입 선택
  const handleTopicTypeSelect = (type: TopicType) => {
    setTopicType(type);
    setUsedTopics(new Set());
    drawNextCard(type);
  };

  // 다음 카드 뽑기
  const drawNextCard = (type: TopicType) => {
    const topics = type === 'light' ? LIGHT_TOPICS : DEEP_TOPICS;
    const availableTopics = topics.filter(topic => !usedTopics.has(topic));
    
    if (availableTopics.length === 0) {
      // 모든 주제를 다 뽑았으면 초기화
      setUsedTopics(new Set());
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      setCurrentTopic(randomTopic);
      setUsedTopics(new Set([randomTopic]));
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableTopics.length);
    const selectedTopic = availableTopics[randomIndex];
    setCurrentTopic(selectedTopic);
    setUsedTopics(prev => new Set([...prev, selectedTopic]));
  };

  // 다음 카드 버튼
  const handleNextCard = () => {
    if (topicType) {
      drawNextCard(topicType);
    }
  };

  // 다시 선택
  const handleReset = () => {
    setTopicType(null);
    setCurrentTopic(null);
    setUsedTopics(new Set());
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
        <button
          onClick={() => router.push('/single')}
          className="rounded-full bg-white/90 px-4 py-2 text-lg font-semibold text-gray-700 shadow-md transition-all hover:bg-white"
        >
          ← 뒤로
        </button>
        <h1 className="text-2xl font-bold text-gray-800">💬 스몰톡 카드</h1>
        <div className="w-20"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {!topicType ? (
          // 주제 타입 선택 화면
          <div className="w-full max-w-md space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                주제를 선택하세요
              </h2>
              <p className="text-gray-600">
                가벼운 대화부터 깊은 이야기까지
              </p>
            </div>

            <button
              onClick={() => handleTopicTypeSelect('light')}
              className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 p-8 text-left shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">😊</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    가벼운 주제
                  </h3>
                  <p className="text-white/90">
                    일상적인 대화와 아이스브레이킹에 좋은 주제들
                  </p>
                </div>
                <div className="text-2xl text-white/80">→</div>
              </div>
            </button>

            <button
              onClick={() => handleTopicTypeSelect('deep')}
              className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-left shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">🤔</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    진중한 주제
                  </h3>
                  <p className="text-white/90">
                    깊이 있는 대화와 서로를 알아가기에 좋은 주제들
                  </p>
                </div>
                <div className="text-2xl text-white/80">→</div>
              </div>
            </button>
          </div>
        ) : (
          // 카드 표시 화면
          <div className="w-full max-w-md space-y-6">
            <div className="text-center mb-4">
              <span className="inline-block px-4 py-2 rounded-full bg-white/90 text-sm font-semibold text-gray-700 shadow-md">
                {topicType === 'light' ? '😊 가벼운 주제' : '🤔 진중한 주제'}
              </span>
            </div>

            {/* 카드 */}
            <div className="relative">
              <div className="bg-white rounded-3xl p-8 shadow-2xl min-h-[300px] flex items-center justify-center">
                <p className="text-2xl font-bold text-gray-800 text-center leading-relaxed">
                  {currentTopic}
                </p>
              </div>
              
              {/* 카드 장식 */}
              <div className="absolute -top-2 -right-2 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 blur-xl"></div>
              <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-20 blur-xl"></div>
            </div>

            {/* 버튼들 */}
            <div className="space-y-3">
              <button
                onClick={handleNextCard}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                다음 카드 뽑기
              </button>
              <button
                onClick={handleReset}
                className="w-full rounded-xl bg-gray-400 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-gray-500 active:scale-95"
              >
                주제 다시 선택
              </button>
            </div>

            {/* 남은 카드 수 표시 */}
            <div className="text-center text-gray-600 text-sm">
              {topicType === 'light' 
                ? `${LIGHT_TOPICS.length - usedTopics.size}개의 주제가 남았어요`
                : `${DEEP_TOPICS.length - usedTopics.size}개의 주제가 남았어요`
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
