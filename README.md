# 🎮 파티 게임 웹 서비스

오프라인 모임에서 바로 즐기는 인터랙티브 랜덤 게임 & 파티 게임 웹 서비스입니다.

## ✨ 주요 기능

### Single Mode (혼자하기)
- **Shake it** 🍾: 화면을 클릭해 병을 터뜨리는 게임
- **Finger Radar** 👆: 손가락으로 당첨자 찾기 (최대 8명)
- **Pixel Race** 🏃: AI 캐릭터 경주 게임

### Multi Mode (함께하기)
- **Tune Coach** ⏱️: 정확히 5초 맞추기 게임
- **The Liar Game** 🎭: 라이어 찾기 게임
- **Telepathy** 🧠: 텔레파시 게임 (같은 선택하기)

## 🚀 시작하기

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
CLIENT_URL=http://localhost:3000
PORT=3001
```

### 3. 개발 서버 실행

**옵션 1: 프론트엔드와 백엔드를 동시에 실행**
```bash
npm run dev:all
```

**옵션 2: 각각 별도로 실행**

터미널 1 (프론트엔드):
```bash
npm run dev
```

터미널 2 (백엔드 - Socket.io 서버):
```bash
npm run dev:server
```

### 4. 브라우저에서 접속

- 프론트엔드: [http://localhost:3000](http://localhost:3000)
- Socket.io 서버: 포트 3001에서 자동 실행

## 📁 프로젝트 구조

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 메인 페이지
│   │   ├── single/            # Single Mode
│   │   └── multi/             # Multi Mode
│   ├── components/
│   │   └── games/             # 게임 컴포넌트
│   │       ├── ShakeIt.tsx
│   │       ├── FingerRadar.tsx
│   │       ├── PixelRace.tsx
│   │       └── multi/         # Multi Mode 게임
│   ├── lib/
│   │   └── socket.ts          # Socket.io 클라이언트
│   └── types/                 # TypeScript 타입 정의
├── server/
│   └── index.ts               # Socket.io 서버
└── package.json
```

## 🛠 기술 스택

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Socket.io
- **실시간 통신**: WebSocket (Socket.io)

## 🎯 게임 설명

### Single Mode

#### Shake it
- 병을 터치하여 흔들기
- 누적 터치 횟수가 임계값에 도달하면 폭발
- 난이도 조절 가능 (낮음/보통/높음)

#### Finger Radar
- 최대 8명까지 손가락을 화면에 올리기
- 3초 스캔 후 랜덤으로 당첨자 선택
- 멀티터치 지원

#### Pixel Race
- 참가자 수 선택 (2-8명)
- AI 캐릭터가 자동으로 경주
- 랜덤 이벤트 (넘어짐, 부스터 등)

### Multi Mode

#### Tune Coach
- 목표 시간(기본 5초)에 정확히 맞추기
- 2-3초 후 화면이 블라인드 처리
- 서버 시간 기준으로 정확도 측정

#### The Liar Game
- 한 명은 라이어로 지정
- 단어 설명 후 투표로 라이어 찾기

#### Telepathy
- 같은 질문에 동시에 선택
- 모두 같은 선택 시 성공
- 실패 시 다른 선택을 한 사람 표시

## 🌐 배포

### Vercel 배포 (프론트엔드)

1. [Vercel](https://vercel.com)에 GitHub 저장소 연결
2. 자동 배포 설정

### Socket.io 서버 배포 (필수)

Vercel은 WebSocket을 직접 지원하지 않으므로, Socket.io 서버를 별도로 배포해야 합니다.

**자세한 배포 가이드**: [DEPLOY.md](./DEPLOY.md) 참조

**추천 플랫폼**:
- ⭐ **Railway** (가장 간단, 무료 플랜 제공)
- **Render** (무료 플랜 제공)
- **Fly.io** (무료 플랜 제공)

**배포 후 필수 설정**:
1. Socket.io 서버 배포 (Railway/Render/Fly.io)
2. Vercel 환경 변수에 `NEXT_PUBLIC_SOCKET_URL` 추가
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-url
   ```
3. Vercel 재배포

## 📝 라이선스

이 프로젝트는 개인 사용 목적으로 제작되었습니다.
