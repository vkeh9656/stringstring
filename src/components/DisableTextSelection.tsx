'use client';

import { useEffect } from 'react';

// 텍스트 선택 완전 차단 컴포넌트
export default function DisableTextSelection() {
  useEffect(() => {
    // 텍스트 선택 이벤트 차단
    const preventSelection = (e: Event) => {
      const target = e.target as HTMLElement;
      // 버튼, 링크, 입력 필드는 허용
      const isInteractive = target.tagName === 'BUTTON' || 
                           target.tagName === 'A' || 
                           target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' ||
                           target.closest('button') !== null ||
                           target.closest('a') !== null ||
                           target.isContentEditable;
      
      if (!isInteractive) {
        e.preventDefault();
        return false;
      }
    };

    // 컨텍스트 메뉴 차단
    const preventContextMenu = (e: Event) => {
      const target = e.target as HTMLElement;
      // 버튼, 링크, 입력 필드는 허용
      const isInteractive = target.tagName === 'BUTTON' || 
                           target.tagName === 'A' || 
                           target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' ||
                           target.closest('button') !== null ||
                           target.closest('a') !== null ||
                           target.isContentEditable;
      
      if (!isInteractive) {
        e.preventDefault();
        return false;
      }
    };

    // 드래그 시작 차단
    const preventDragStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // body에 이벤트 핸들러 추가
    document.body.addEventListener('selectstart', preventSelection);
    document.body.addEventListener('contextmenu', preventContextMenu);
    document.body.addEventListener('dragstart', preventDragStart);
    
    // 모바일 특화 이벤트 - 버튼 클릭은 허용
    const preventTouchCallout = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // 버튼, 링크, 입력 필드는 허용
      const isInteractive = target.tagName === 'BUTTON' || 
                           target.tagName === 'A' || 
                           target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' ||
                           target.closest('button') !== null ||
                           target.closest('a') !== null ||
                           target.isContentEditable;
      
      if (!isInteractive) {
        // 버튼이 아닌 경우에만 차단
      }
    };

    // CSS 스타일 강제 적용
    const style = document.createElement('style');
    style.id = 'disable-text-selection';
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      input, textarea, [contenteditable] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
      }
    `;
    
    // 기존 스타일이 있으면 제거
    const existingStyle = document.getElementById('disable-text-selection');
    if (existingStyle) {
      document.head.removeChild(existingStyle);
    }
    
    document.head.appendChild(style);

    return () => {
      document.body.removeEventListener('selectstart', preventSelection);
      document.body.removeEventListener('contextmenu', preventContextMenu);
      document.body.removeEventListener('dragstart', preventDragStart);
      
      const styleToRemove = document.getElementById('disable-text-selection');
      if (styleToRemove) {
        document.head.removeChild(styleToRemove);
      }
    };
  }, []);

  return null;
}

