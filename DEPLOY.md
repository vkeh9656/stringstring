# 🚀 Socket.io 서버 배포 가이드

## ⚠️ Vercel 제한사항

**Vercel은 WebSocket을 지원하지 않습니다!**

- Vercel은 서버리스 함수만 지원 (요청 종료 시 함수 종료)
- Socket.io는 지속적인 연결이 필요
- 따라서 Vercel에서 Socket.io 서버를 직접 배포할 수 없음

**해결책**: Socket.io 서버를 별도 플랫폼에 배포하고, Vercel 프론트엔드에서 연결

## 추천 플랫폼

### 1. Railway (추천) ⭐
- 무료 플랜 제공
- GitHub 연동 쉬움
- 자동 배포
- 환경 변수 설정 간편

### 2. Render
- 무료 플랜 제공
- GitHub 연동 가능
- 자동 배포

### 3. Fly.io
- 무료 플랜 제공
- Docker 기반

---

## Railway 배포 방법

### 1단계: Railway 계정 생성 및 프로젝트 생성

1. [Railway](https://railway.app)에 접속하여 GitHub 계정으로 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 이 저장소 선택

### 2단계: 서비스 설정

1. 프로젝트에서 "New Service" 클릭
2. "Empty Service" 선택
3. 서비스 이름: `socket-server` (또는 원하는 이름)

### 3단계: 환경 변수 설정

Railway 대시보드에서 "Variables" 탭으로 이동하여 다음 환경 변수를 추가:

```
PORT=3001
NODE_ENV=production
```

**참고**: Railway는 자동으로 PORT를 할당하므로, `PORT` 환경 변수는 선택사항입니다. 
서버 코드에서 `process.env.PORT || 3001`을 사용하므로 자동으로 할당된 포트를 사용합니다.

### 4단계: 배포 설정

1. "Settings" 탭으로 이동
2. "Build Command": `npm install` (기본값)
3. "Start Command": `npm run start:server`
4. "Root Directory": `/` (기본값)

### 5단계: 배포 확인

1. "Deployments" 탭에서 배포 상태 확인
2. 배포가 완료되면 "Settings" → "Networking"에서 공개 URL 확인
   - 예: `https://your-project.up.railway.app`
   - 또는 `https://socket-server-production-xxxx.up.railway.app`

### 6단계: Vercel 환경 변수 설정

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택
3. "Settings" → "Environment Variables" 이동
4. 다음 환경 변수 추가:

```
NEXT_PUBLIC_SOCKET_URL=https://your-railway-url.up.railway.app
```

**중요**: 
- Railway URL은 `https://`로 시작하지만, Socket.io는 자동으로 `wss://`를 사용합니다.
- URL에 포트 번호를 포함하지 마세요 (Railway가 자동으로 처리합니다).

### 7단계: Vercel 재배포

환경 변수를 추가한 후 Vercel 프로젝트를 재배포합니다:

```bash
# 또는 Vercel Dashboard에서 "Redeploy" 클릭
vercel --prod
```

---

## Render 배포 방법

### 1단계: Render 계정 생성

1. [Render](https://render.com)에 접속하여 GitHub 계정으로 로그인

### 2단계: 새 Web Service 생성

1. "New +" → "Web Service" 클릭
2. GitHub 저장소 선택
3. 설정:
   - **Name**: `socket-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:server`
   - **Plan**: Free (또는 원하는 플랜)

### 3단계: 환경 변수 설정

"Environment" 섹션에서:

```
NODE_ENV=production
PORT=3001
```

### 4단계: 배포 및 URL 확인

1. "Create Web Service" 클릭
2. 배포 완료 후 공개 URL 확인
   - 예: `https://socket-server.onrender.com`

### 5단계: Vercel 환경 변수 설정

Vercel Dashboard에서:

```
NEXT_PUBLIC_SOCKET_URL=https://socket-server.onrender.com
```

---

## Fly.io 배포 방법

### 1단계: Fly.io CLI 설치

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### 2단계: Fly.io 로그인

```bash
fly auth login
```

### 3단계: Fly.io 앱 생성

```bash
fly launch
```

### 4단계: fly.toml 설정

`fly.toml` 파일이 생성되면 다음과 같이 수정:

```toml
[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "3001"
  NODE_ENV = "production"

[[services]]
  internal_port = 3001
  protocol = "tcp"
  [[services.ports]]
    port = 80
    handlers = ["http"]
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### 5단계: 배포

```bash
fly deploy
```

### 6단계: URL 확인 및 Vercel 설정

배포 후 URL 확인:

```bash
fly status
```

Vercel 환경 변수에 추가:

```
NEXT_PUBLIC_SOCKET_URL=https://your-app.fly.dev
```

---

## 배포 후 확인 사항

### 1. Socket.io 서버 연결 테스트

브라우저 콘솔에서 확인:

```javascript
// 정상 연결 시
✅ Socket 연결 성공

// 연결 실패 시
❌ WebSocket connection failed
```

### 2. CORS 설정 확인

`server/index.ts`에서 CORS 설정이 올바른지 확인:

```typescript
cors: {
  origin: '*', // 프로덕션에서는 특정 도메인으로 제한 권장
  methods: ['GET', 'POST'],
}
```

**보안 권장사항**: 프로덕션에서는 `origin: '*'` 대신 Vercel 도메인만 허용:

```typescript
cors: {
  origin: process.env.CLIENT_URL || 'https://your-vercel-app.vercel.app',
  methods: ['GET', 'POST'],
}
```

그리고 Railway/Render 환경 변수에 추가:

```
CLIENT_URL=https://your-vercel-app.vercel.app
```

---

## 문제 해결

### 문제: WebSocket 연결 실패

**원인 1**: 환경 변수가 설정되지 않음
- 해결: Vercel Dashboard에서 `NEXT_PUBLIC_SOCKET_URL` 확인

**원인 2**: Socket.io 서버가 실행되지 않음
- 해결: Railway/Render 로그 확인

**원인 3**: CORS 오류
- 해결: `server/index.ts`의 CORS 설정 확인

### 문제: Railway/Render에서 빌드 실패

**원인**: `better-sqlite3` 네이티브 모듈 빌드 실패
- 해결: Railway는 자동으로 처리하지만, Render는 추가 설정 필요할 수 있음

---

## 비용

- **Railway**: 무료 플랜 (월 $5 크레딧, 충분함)
- **Render**: 무료 플랜 (15분 비활성 시 슬리프 모드)
- **Fly.io**: 무료 플랜 (제한적)

---

## 추가 참고사항

- Socket.io 서버는 지속적인 연결을 유지해야 하므로, 서버리스 함수로는 작동하지 않습니다.
- Railway나 Render의 무료 플랜으로도 충분히 사용 가능합니다.
- 프로덕션에서는 데이터베이스 백업을 고려하세요 (현재는 SQLite 파일 사용).
