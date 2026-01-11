'use client';

import { useState } from 'react';
import Link from 'next/link';

// 메인 페이지 - 모드 선택
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* 타이틀 */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">
            🎮 파티 게임
          </h1>
          <p className="text-xl text-white/90">
            오프라인 모임에서 바로 즐기는 인터랙티브 게임
          </p>
        </div>

        {/* 모드 선택 버튼 */}
        <div className="space-y-4">
          <Link
            href="/single"
            className="block w-full rounded-2xl bg-white/90 px-8 py-6 text-2xl font-bold text-purple-600 shadow-xl transition-all hover:scale-105 hover:bg-white active:scale-95"
          >
            📱 혼자하기
          </Link>
          <Link
            href="/multi"
            className="block w-full rounded-2xl bg-white/90 px-8 py-6 text-2xl font-bold text-pink-600 shadow-xl transition-all hover:scale-105 hover:bg-white active:scale-95"
          >
            👥 함께하기
          </Link>
        </div>

        {/* 설명 */}
        <div className="rounded-xl bg-white/20 p-4 text-sm text-white/80 backdrop-blur-sm">
          <p>💡 한 대의 스마트폰으로 바로 시작하세요!</p>
        </div>
      </div>
    </div>
  );
}
