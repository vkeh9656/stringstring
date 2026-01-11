'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

interface CatchMindProps {
  gameData: any;
  isHost: boolean;
  onBackToRoom: () => void;
}

// 그리기 도구 타입
type Tool = 'pen' | 'eraser';

// 세션에서 사용자 ID 가져오기 (초기화 시 바로 실행)
const getStoredUserId = () => {
  if (typeof window === 'undefined') return '';
  const savedUser = sessionStorage.getItem('multiUser');
  if (savedUser) {
    try {
      return JSON.parse(savedUser).userId || '';
    } catch {
      return '';
    }
  }
  return '';
};

// 캐치마인드 게임 컴포넌트
export default function CatchMind({ gameData, isHost, onBackToRoom }: CatchMindProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  
  // 현재 사용자 정보 (즉시 초기화)
  const [currentUserId, setCurrentUserId] = useState<string>(getStoredUserId);
  
  // 게임 상태
  const [drawerId, setDrawerId] = useState<string>(gameData?.drawerId || '');
  const [drawerNickname, setDrawerNickname] = useState<string>(gameData?.drawerNickname || '');
  const [word, setWord] = useState<string | null>(gameData?.word || null);
  const [round, setRound] = useState(gameData?.round || 1);
  const [maxRounds, setMaxRounds] = useState(gameData?.maxRounds || 3);
  const [timeLeft, setTimeLeft] = useState(gameData?.timeLimit || 60);
  const [scores, setScores] = useState<{ [key: string]: number }>(gameData?.scores || {});
  const [guess, setGuess] = useState('');
  const [messages, setMessages] = useState<{ nickname: string; text: string; isCorrect?: boolean }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string>('');
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  
  // 정답 맞춤 표시 (3초간 표시)
  const [correctInfo, setCorrectInfo] = useState<{ nickname: string; answer: string; score?: number } | null>(null);
  
  // 포기 표시 (3초간 표시)
  const [skippedInfo, setSkippedInfo] = useState<{ answer: string; drawerNickname: string } | null>(null);
  
  // 포기 확인 모달
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  
  // 출제자인지 확인
  const isDrawer = currentUserId !== '' && drawerId !== '' && currentUserId === drawerId;
  
  // 색상 팔레트
  const COLORS = [
    '#000000', '#FFFFFF', '#FF0000', '#FF9900', '#FFFF00',
    '#00FF00', '#00FFFF', '#0000FF', '#9900FF', '#FF00FF',
    '#8B4513', '#808080', '#FFC0CB', '#90EE90', '#ADD8E6',
  ];

  // 현재 사용자 ID 확인 (마운트 시)
  useEffect(() => {
    const storedId = getStoredUserId();
    if (storedId && storedId !== currentUserId) {
      setCurrentUserId(storedId);
    }
    console.log('CatchMind 마운트: currentUserId =', storedId, ', drawerId =', drawerId);
  }, []);

  // 초기 게임 데이터 설정
  useEffect(() => {
    if (gameData) {
      console.log('gameData 변경:', gameData);
      if (gameData.drawerId) setDrawerId(gameData.drawerId);
      if (gameData.drawerNickname) setDrawerNickname(gameData.drawerNickname);
      if (gameData.word !== undefined) setWord(gameData.word);
      if (gameData.round) setRound(gameData.round);
      if (gameData.maxRounds) setMaxRounds(gameData.maxRounds);
      // 서버에서 계산한 남은 시간 우선 사용 (동기화)
      if ((gameData as any).timeLeft !== undefined) {
        setTimeLeft((gameData as any).timeLeft);
      } else if (gameData.timeLimit) {
        setTimeLeft(gameData.timeLimit);
      }
      if (gameData.scores) setScores(gameData.scores);
    }
  }, [gameData]);

  // 소켓 이벤트 핸들러
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // 게임 시작
    const handleStarted = (data: any) => {
      console.log('CatchMind 시작 수신:', data);
      console.log('현재 userId:', currentUserId);
      console.log('출제자 drawerId:', data.drawerId);
      console.log('내가 출제자?', currentUserId === data.drawerId);
      
      setDrawerId(data.drawerId);
      setDrawerNickname(data.drawerNickname);
      setWord(data.word);
      setRound(data.round);
      setMaxRounds(data.maxRounds);
      // 서버에서 계산한 남은 시간 사용 (동기화)
      setTimeLeft(data.timeLeft !== undefined ? data.timeLeft : data.timeLimit);
      if (data.scores) setScores(data.scores);
      setHasGuessedCorrectly(false);
      clearCanvas();
    };

    // 그림 수신
    const handleDraw = (data: any) => {
      drawOnCanvas(data.drawData);
    };

    // 캔버스 지우기
    const handleClear = () => {
      clearCanvas();
    };

    // 정답 맞춤
    const handleCorrect = (data: any) => {
      setScores(data.scores);
      setMessages(prev => [...prev, {
        nickname: '시스템',
        text: `${data.guessernickname}님이 정답을 맞췄습니다!`,
        isCorrect: true,
      }]);
      
      // 정답 맞춤 오버레이 표시 (3초)
      setCorrectInfo({ nickname: data.guessernickname, answer: data.answer, score: data.scoreGained });
      setTimeout(() => {
        setCorrectInfo(null);
      }, 3000);
      
      // 자신이 맞췄으면 플래그 설정
      if (data.oderId === currentUserId) {
        setHasGuessedCorrectly(true);
      }
    };

    // 시간 초과
    const handleTimeout = (data: any) => {
      setScores(data.scores);
      setMessages(prev => [...prev, {
        nickname: '⏰ 시스템',
        text: `시간 초과! 정답은 "${data.answer}"였습니다.`,
        isCorrect: false,
      }]);
    };

    // 다음 턴
    const handleNextTurn = (data: any) => {
      setDrawerId(data.drawerId);
      setDrawerNickname(data.drawerNickname);
      setWord(data.word);
      setRound(data.round);
      // 서버에서 계산한 남은 시간 사용 (동기화)
      setTimeLeft(data.timeLeft !== undefined ? data.timeLeft : 60);
      
      // 이미 맞춘 사람들 정보 확인 (재연결 시 동기화)
      if (data.correctUsers && Array.isArray(data.correctUsers)) {
        const hasGuessed = data.correctUsers.includes(currentUserId);
        setHasGuessedCorrectly(hasGuessed);
      } else {
        // 새 턴이면 초기화
        setHasGuessedCorrectly(false);
      }
      
      clearCanvas();
      setMessages([]);
    };

    // 게임 결과
    const handleResults = (data: any) => {
      setScores(data.scores);
      setWinner(data.winner);
      setGameOver(true);
    };
    
    // 포기됨
    const handleSkipped = (data: any) => {
      setSkippedInfo({ answer: data.answer, drawerNickname: data.drawerNickname });
      setMessages(prev => [...prev, {
        nickname: '시스템',
        text: `${data.drawerNickname}님이 포기했습니다. 정답: ${data.answer}`,
        isCorrect: false,
      }]);
      setTimeout(() => {
        setSkippedInfo(null);
      }, 3000);
    };
    
    // 채팅 메시지 수신
    const handleChat = (data: any) => {
      // 자신이 보낸 메시지는 이미 로컬에서 추가했으므로 무시
      if (data.oderId === currentUserId) return;
      
      setMessages(prev => [...prev, {
        nickname: data.nickname,
        text: data.message,
      }]);
    };

    socket.on('catchmind:started', handleStarted);
    socket.on('catchmind:draw', handleDraw);
    socket.on('catchmind:clear', handleClear);
    socket.on('catchmind:correct', handleCorrect);
    socket.on('catchmind:timeout', handleTimeout);
    socket.on('catchmind:next-turn', handleNextTurn);
    socket.on('catchmind:results', handleResults);
    socket.on('catchmind:chat', handleChat);
    socket.on('catchmind:skipped', handleSkipped);

    return () => {
      socket.off('catchmind:started', handleStarted);
      socket.off('catchmind:draw', handleDraw);
      socket.off('catchmind:clear', handleClear);
      socket.off('catchmind:correct', handleCorrect);
      socket.off('catchmind:timeout', handleTimeout);
      socket.off('catchmind:next-turn', handleNextTurn);
      socket.off('catchmind:results', handleResults);
      socket.off('catchmind:chat', handleChat);
      socket.off('catchmind:skipped', handleSkipped);
    };
  }, [currentUserId]);

  // 타이머
  useEffect(() => {
    if (gameOver) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [round, gameOver]);

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // 캔버스 지우기
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // 캔버스에 그리기
  const drawOnCanvas = useCallback((drawData: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = drawData.color;
    ctx.lineWidth = drawData.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(drawData.x1, drawData.y1);
    ctx.lineTo(drawData.x2, drawData.y2);
    ctx.stroke();
  }, []);

  // 마우스/터치 좌표 가져오기
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  // 그리기 시작
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    setIsDrawing(true);
    setLastPos(coords);
  };

  // 그리기
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawer || !lastPos) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;

    const drawData = {
      x1: lastPos.x,
      y1: lastPos.y,
      x2: coords.x,
      y2: coords.y,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
    };

    // 로컬에 그리기
    drawOnCanvas(drawData);
    
    // 서버에 전송
    const socket = getSocket();
    if (socket) {
      socket.emit('catchmind:draw', { drawData });
    }

    setLastPos(coords);
  };

  // 그리기 종료
  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  // 캔버스 지우기 버튼
  const handleClearCanvas = () => {
    if (!isDrawer) return;
    
    clearCanvas();
    
    const socket = getSocket();
    if (socket) {
      socket.emit('catchmind:clear');
    }
  };

  // 정답 제출
  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || isDrawer || hasGuessedCorrectly) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('catchmind:guess', { guess: guess.trim() });
      setMessages(prev => [...prev, { nickname: '나', text: guess.trim() }]);
      setGuess('');
    }
  };

  // 닉네임으로 사용자 찾기
  const getNicknameById = (userId: string) => {
    const user = gameData?.userList?.find((u: any) => u.userId === userId);
    return user?.nickname || userId;
  };
  
  // userList가 있고 scores가 비어있으면 초기화
  useEffect(() => {
    if (gameData?.userList && Object.keys(scores).length === 0) {
      const initialScores: { [key: string]: number } = {};
      gameData.userList.forEach((user: any) => {
        initialScores[user.userId] = 0;
      });
      setScores(initialScores);
      console.log('scores 초기화:', initialScores);
    }
  }, [gameData?.userList]);
  
  // drawerNickname이 비어있으면 userList에서 찾기
  useEffect(() => {
    if (drawerId && !drawerNickname && gameData?.userList) {
      const drawer = gameData.userList.find((u: any) => u.userId === drawerId);
      if (drawer) {
        setDrawerNickname(drawer.nickname);
        console.log('drawerNickname 설정:', drawer.nickname);
      }
    }
  }, [drawerId, drawerNickname, gameData?.userList]);

  // 게임 결과 화면
  if (gameOver) {
    const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);
    
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-yellow-100 to-orange-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="mb-6 text-center text-2xl font-bold text-black">🏆 게임 결과</h1>
          
          <div className="space-y-3">
            {sortedScores.map(([oderId, score], index) => (
              <div
                key={oderId}
                className={`flex items-center justify-between rounded-lg p-3 ${
                  index === 0 ? 'bg-yellow-100' : 'bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-black">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                  </span>
                  <span className="text-lg font-semibold text-black">
                    {getNicknameById(oderId)}
                  </span>
                </div>
                <span className="text-xl font-bold text-orange-600">{score}점</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={onBackToRoom}
            className="mt-6 w-full rounded-xl bg-orange-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-orange-600 active:scale-95"
          >
            대기실로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-yellow-100 to-orange-100 p-1 md:p-2">
      {/* 상단 정보 */}
      <div className="shrink-0 mb-1 rounded-lg bg-white p-1.5 md:p-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-black">
            R{round}/{maxRounds}
          </div>
          <div className={`text-base md:text-xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-black'}`}>
            ⏱️ {timeLeft}초
          </div>
          <div className="text-xs font-bold text-black truncate max-w-20">
            🎨 {drawerNickname || '...'}
          </div>
        </div>
        
        {/* 출제자에게 단어 표시 */}
        {isDrawer && word && (
          <div className="mt-1 rounded-lg bg-yellow-200 p-1 text-center">
            <p className="text-lg font-bold text-black">{word}</p>
          </div>
        )}
        
        {/* 맞춘 경우 */}
        {hasGuessedCorrectly && !isDrawer && (
          <div className="mt-1 rounded-lg bg-green-200 p-1 text-center">
            <p className="text-sm font-bold text-green-700">✅ 정답!</p>
          </div>
        )}
      </div>

      {/* 캔버스 영역 - 남은 공간 모두 채움 */}
      <div className="flex-1 min-h-0 flex flex-col gap-1">
        <div className="relative flex-1 rounded-lg bg-white shadow-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              className="w-full h-full touch-none"
              style={{ cursor: isDrawer ? 'crosshair' : 'not-allowed' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            
            {!isDrawer && (
              <div className="absolute top-2 left-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
                👀 관전 중
              </div>
            )}
            
            {/* 정답 맞춤 오버레이 */}
            {correctInfo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                <div className="rounded-2xl bg-white p-8 text-center shadow-2xl animate-bounce">
                  <div className="text-5xl mb-4">🎉</div>
                  <div className="text-2xl font-bold text-green-600 mb-2">정답!</div>
                  <div className="text-xl font-bold text-black mb-1">{correctInfo.nickname}님</div>
                  <div className="text-lg text-gray-600">정답: <span className="font-bold text-orange-600">{correctInfo.answer}</span></div>
                  {correctInfo.score && (
                    <div className="text-lg font-bold text-blue-600 mt-2">+{correctInfo.score}점</div>
                  )}
                </div>
              </div>
            )}
            
            {/* 포기됨 오버레이 */}
            {skippedInfo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
                  <div className="text-5xl mb-4">😢</div>
                  <div className="text-2xl font-bold text-gray-600 mb-2">포기!</div>
                  <div className="text-xl font-bold text-black mb-1">{skippedInfo.drawerNickname}님이 포기했습니다</div>
                  <div className="text-lg text-gray-600">정답: <span className="font-bold text-orange-600">{skippedInfo.answer}</span></div>
                </div>
              </div>
            )}
            
            {/* 포기 확인 모달 */}
            {showSkipConfirm && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                <div className="rounded-2xl bg-white p-6 text-center shadow-2xl">
                  <div className="text-xl font-bold text-black mb-4">정말 포기하시겠습니까?</div>
                  <div className="text-sm text-gray-600 mb-4">포기하면 점수를 얻지 못합니다.</div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSkipConfirm(false)}
                      className="flex-1 rounded-lg bg-gray-300 px-4 py-2 font-bold text-black transition-all hover:bg-gray-400"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        setShowSkipConfirm(false);
                        const socket = getSocket();
                        if (socket) {
                          socket.emit('catchmind:skip');
                        }
                      }}
                      className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-bold text-white transition-all hover:bg-red-600"
                    >
                      포기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        {/* 출제자 도구 */}
        {isDrawer && (
          <div className="shrink-0 rounded-lg bg-white p-1 shadow-lg">
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setTool('pen')}
                className={`rounded px-2 py-1 text-sm font-bold ${
                  tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                }`}
              >
                ✏️
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`rounded px-2 py-1 text-sm font-bold ${
                  tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                }`}
              >
                🧽
              </button>
              <button
                onClick={handleClearCanvas}
                className="rounded bg-red-500 px-2 py-1 text-sm font-bold text-white"
              >
                🗑️
              </button>
              <button
                onClick={() => setShowSkipConfirm(true)}
                className="rounded bg-gray-500 px-2 py-1 text-sm font-bold text-white"
              >
                🏳️
              </button>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-16"
              />
              <div className="flex gap-0.5">
                {COLORS.slice(0, 10).map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-5 w-5 rounded-full border-2 ${
                      color === c ? 'border-black' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 영역: 점수 + 채팅 + 입력 */}
      <div className="shrink-0 flex gap-1 h-24 mt-1">
        {/* 점수판 */}
        <div className="w-20 rounded-lg bg-white p-1 shadow-lg overflow-hidden flex flex-col">
          <h3 className="text-xs font-bold text-black">🏆</h3>
          <div className="flex-1 overflow-y-auto">
            {Object.entries(scores)
              .sort(([, a], [, b]) => b - a)
              .map(([oderId, score]) => (
                <div key={oderId} className="flex justify-between text-xs">
                  <span className={`truncate ${oderId === drawerId ? 'text-orange-600' : 'text-black'}`}>
                    {getNicknameById(oderId)}
                  </span>
                  <span className="font-bold text-orange-600">{score}</span>
                </div>
              ))}
          </div>
        </div>
        
        {/* 채팅 + 입력 */}
        <div className="flex-1 rounded-lg bg-white p-1 shadow-lg flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-1">
            {messages.length === 0 ? (
              <div className="text-xs text-gray-400">정답을 입력하세요</div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs ${msg.isCorrect ? 'text-green-600 font-bold' : 'text-black'}`}
                >
                  {msg.nickname}: {msg.text}
                </div>
              ))
            )}
          </div>
          
          {/* 정답 입력 */}
          {!isDrawer && !hasGuessedCorrectly ? (
            <form onSubmit={handleSubmitGuess} className="flex gap-1 shrink-0">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="정답..."
                className="flex-1 rounded border px-2 py-1 text-xs text-black min-w-0"
              />
              <button
                type="submit"
                className="rounded bg-orange-500 px-2 py-1 text-xs font-bold text-white"
              >
                전송
              </button>
            </form>
          ) : (
            <div className="text-xs text-gray-400 shrink-0">
              {isDrawer ? '그림을 그리세요!' : '✅ 정답!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

