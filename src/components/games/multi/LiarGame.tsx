'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';

interface LiarGameProps {
  gameData: any;
  isHost: boolean;
  onBackToRoom: () => void;
}

// Liar Game 컴포넌트 (오프라인 대화 후 투표)
export default function LiarGame({ gameData, isHost, onBackToRoom }: LiarGameProps) {
  // gameData에서 직접 역할과 단어 가져오기
  const [role, setRole] = useState<'citizen' | 'liar' | 'fool' | null>(null);
  const [word, setWord] = useState('');
  const [topic, setTopic] = useState('');
  const [voted, setVoted] = useState(false);
  const [voteTarget, setVoteTarget] = useState('');
  const [results, setResults] = useState<any>(null);
  const [phase, setPhase] = useState<'info' | 'vote' | 'result'>('info');
  const [userNicknames, setUserNicknames] = useState<{ [key: string]: string }>({});
  const [votedUsers, setVotedUsers] = useState<Set<string>>(new Set());

  // gameData에서 역할과 단어 초기화
  useEffect(() => {
    if (gameData) {
      // 서버에서 game:started와 함께 전달된 역할과 단어
      if (gameData.myRole) {
        setRole(gameData.myRole as any);
      }
      if (gameData.myWord) {
        setWord(gameData.myWord);
      }
      if (gameData.topic) {
        setTopic(gameData.topic);
      }
      
      // 사용자 목록에서 닉네임 정보 추출
      if (gameData.userList) {
        const nicknames: { [key: string]: string } = {};
        gameData.userList.forEach((user: any) => {
          nicknames[user.userId] = user.nickname;
        });
        setUserNicknames(nicknames);
      }
    }
  }, [gameData]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // 투표 수신 (누가 투표했는지 표시)
    const handleVoted = (data: { userId: string; targetUserId: string }) => {
      setVotedUsers(prev => new Set(prev).add(data.userId));
    };

    // 결과 수신
    const handleResults = (data: { votes: any; liar: string }) => {
      setResults(data);
      setPhase('result');
    };

    socket.on('liar-game:voted', handleVoted);
    socket.on('liar-game:results', handleResults);

    return () => {
      socket.off('liar-game:voted', handleVoted);
      socket.off('liar-game:results', handleResults);
    };
  }, []);

  // 투표 단계로 이동
  const handleGoToVote = () => {
    setPhase('vote');
  };

  // 투표
  const handleVote = (targetUserId: string) => {
    if (voted) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('liar-game:vote', { targetUserId });
      setVoteTarget(targetUserId);
      setVoted(true);
    }
  };

  // 가장 많은 득표 받은 사람
  const getMostVotedUser = () => {
    if (!results?.votes) return null;
    const voteCount: { [key: string]: number } = {};
    Object.values(results.votes).forEach((targetId) => {
      voteCount[targetId as string] = (voteCount[targetId as string] || 0) + 1;
    });
    const maxVotes = Math.max(...Object.values(voteCount));
    const mostVoted = Object.keys(voteCount).find(id => voteCount[id] === maxVotes);
    return mostVoted;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-100 to-pink-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 역할 및 단어 확인 단계 */}
        {phase === 'info' && (
          <>
            <div className="rounded-2xl bg-white p-6 shadow-xl text-center">
              <h1 className="mb-2 text-2xl font-bold text-black">🎭 The Liar Game</h1>
              <p className="text-lg font-medium text-black">주제: {topic || gameData?.topic || '음식'}</p>
              
              {/* 라이어에게는 단어를 보여주지 않음 */}
              {role !== 'liar' && (
                <div className="mt-4 rounded-lg bg-yellow-100 p-4">
                  <p className="text-sm font-medium text-black">이번 라운드 단어:</p>
                  <p className="mt-2 text-3xl font-bold text-black">
                    {word || '???'}
                  </p>
                </div>
              )}
              {role === 'liar' && (
                <div className="mt-4 rounded-lg bg-gray-200 p-4">
                  <p className="text-sm font-medium text-black">이번 라운드 단어:</p>
                  <p className="mt-2 text-3xl font-bold text-gray-500">
                    ???
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    다른 사람들의 설명을 듣고 추측하세요!
                  </p>
                </div>
              )}

              <div className={`mt-4 rounded-lg p-4 ${
                role === 'liar' ? 'bg-red-200' : 'bg-blue-100'
              }`}>
                <p className="text-sm font-medium text-black">당신의 역할:</p>
                <p className={`text-2xl font-bold ${
                  role === 'liar' ? 'text-red-700' : 'text-blue-800'
                }`}>
                  {role === 'citizen' && '🙂 시민'}
                  {role === 'liar' && '🤫 라이어'}
                  {role === 'fool' && '🤪 바보'}
                </p>
                {role === 'liar' && (
                  <p className="mt-2 text-sm text-red-600 font-semibold">
                    당신만 라이어입니다! 들키지 마세요!
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="mb-3 text-lg font-bold text-black">📢 게임 방법</h2>
              <ol className="space-y-2 text-sm text-black">
                <li>1. 각자 역할을 확인하세요</li>
                <li>2. 오프라인에서 돌아가며 단어를 설명하세요</li>
                <li>3. 라이어는 단어를 모르는 척 해야 합니다</li>
                <li>4. 대화가 끝나면 투표를 시작하세요</li>
              </ol>
            </div>

            <button
              onClick={handleGoToVote}
              className="w-full rounded-xl bg-red-500 px-6 py-4 text-xl font-bold text-white transition-all hover:bg-red-600 active:scale-95"
            >
              🗳️ 투표하러 가기
            </button>
          </>
        )}

        {/* 투표 단계 */}
        {phase === 'vote' && (
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-black text-center">🗳️ 라이어 투표</h2>
            <p className="mb-4 text-sm text-black text-center">누가 라이어라고 생각하나요?</p>
            
            <div className="space-y-2">
              {gameData?.userList?.map((user: any) => (
                <button
                  key={user.userId}
                  onClick={() => handleVote(user.userId)}
                  disabled={voted}
                  className={`w-full rounded-lg p-4 text-left transition-all ${
                    voted && voteTarget === user.userId
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  } disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-semibold ${
                      voted && voteTarget === user.userId ? 'text-white' : 'text-black'
                    }`}>
                      {user.nickname}
                    </span>
                    {votedUsers.has(user.userId) && (
                      <span className="text-xs bg-green-400 text-black px-2 py-1 rounded-full">
                        투표완료
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {voted && (
              <div className="mt-4 rounded-lg bg-yellow-100 p-3 text-center">
                <p className="text-sm font-semibold text-black">
                  투표 완료! ({votedUsers.size}/{gameData?.userList?.length || 0}명 투표)
                </p>
                <p className="text-xs text-black mt-1">
                  다른 플레이어의 투표를 기다리는 중...
                </p>
              </div>
            )}
          </div>
        )}

        {/* 결과 단계 */}
        {phase === 'result' && results && (
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-center text-2xl font-bold text-black">🎉 결과 발표</h2>
            
            <div className="space-y-4">
              {/* 가장 많은 득표 */}
              <div className="rounded-lg bg-orange-100 p-4 text-center">
                <p className="text-sm font-medium text-black">가장 많은 표를 받은 사람</p>
                <p className="text-2xl font-bold text-orange-700">
                  {userNicknames[getMostVotedUser() || ''] || '???'}
                </p>
              </div>

              {/* 실제 라이어 */}
              <div className={`rounded-lg p-4 text-center ${
                getMostVotedUser() === results.liar ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <p className="text-sm font-medium text-black">실제 라이어는...</p>
                <p className={`text-2xl font-bold ${
                  getMostVotedUser() === results.liar ? 'text-green-700' : 'text-red-700'
                }`}>
                  🎭 {userNicknames[results.liar] || results.liar}
                </p>
                <p className={`mt-2 text-lg font-semibold ${
                  getMostVotedUser() === results.liar ? 'text-green-600' : 'text-red-600'
                }`}>
                  {getMostVotedUser() === results.liar 
                    ? '✅ 라이어를 찾았습니다!' 
                    : '❌ 라이어가 도망쳤습니다!'}
                </p>
              </div>

              {role === 'liar' && (
                <div className="rounded-lg bg-purple-100 p-3 text-center">
                  <p className="text-sm font-bold text-purple-700">
                    당신이 라이어였습니다!
                  </p>
                </div>
              )}

              <button
                onClick={onBackToRoom}
                className="w-full rounded-xl bg-red-500 px-6 py-4 text-lg font-bold text-white transition-all hover:bg-red-600 active:scale-95"
              >
                대기실로 돌아가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
