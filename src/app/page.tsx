'use client';

import { useState } from 'react';
import Link from 'next/link';

// 메인 페이지 - 모드 선택
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* 타이틀 */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">
            🪢 끈끈
          </h1>
          <p className="text-xl text-white/90">
            어제보다 오늘 더 멋진 우리
          </p>
        </div>

        {/* 모드 선택 버튼 */}
        <div className="space-y-4">
          <Link
            href="/single"
            className="block w-full rounded-2xl bg-white/95 px-8 py-6 text-2xl font-bold text-indigo-700 shadow-xl transition-all hover:scale-105 hover:bg-white hover:shadow-2xl active:scale-95"
          >
            📱 Single Mode
          </Link>
          <Link
            href="/multi"
            className="block w-full rounded-2xl bg-white/95 px-8 py-6 text-2xl font-bold text-purple-700 shadow-xl transition-all hover:scale-105 hover:bg-white hover:shadow-2xl active:scale-95"
          >
            👥 Multi Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
