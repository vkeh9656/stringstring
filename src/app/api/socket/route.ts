// Socket.io 서버 설정 (Next.js API Route)
// 참고: Next.js는 기본적으로 Socket.io 서버를 직접 지원하지 않으므로
// 별도의 서버 파일이 필요합니다. 이 파일은 참고용입니다.

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response('Socket.io server should run on separate port', {
    status: 200,
  });
}


