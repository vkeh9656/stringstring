# 🚂 Railway 빠른 시작 가이드

## 1단계: Railway 프로젝트 생성

1. [railway.app](https://railway.app) 접속
2. "Start a New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 이 저장소 선택

## 2단계: 서비스 생성

1. "New" → "Empty Service" 클릭
2. 서비스 이름: `socket-server` (또는 원하는 이름)

## 3단계: 배포 설정

1. "Settings" 탭 클릭
2. "Deploy" 섹션에서:
   - **Start Command**: `npm run start:server`
   - **Root Directory**: `/` (기본값)

## 4단계: 환경 변수 (선택사항)

"Variables" 탭에서:

```
NODE_ENV=production
```

## 5단계: 배포 확인

1. "Deployments" 탭에서 배포 상태 확인
2. 배포 완료 후 "Settings" → "Networking"에서 공개 URL 확인
   - 예: `https://socket-server-production-xxxx.up.railway.app`

## 6단계: Vercel 환경 변수 설정

1. Vercel Dashboard → 프로젝트 선택
2. Settings → Environment Variables
3. 추가:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-railway-url.up.railway.app
   ```
   ⚠️ **중요**: URL에 포트 번호 포함하지 마세요!

## 7단계: Vercel 재배포

Vercel Dashboard에서 "Redeploy" 클릭

## 완료! 🎉

이제 멀티모드가 정상 작동합니다!
