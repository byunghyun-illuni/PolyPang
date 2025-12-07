# PolyPang Server - Railway 배포 가이드

## 사전 준비

1. **Railway 계정 생성**
   - https://railway.app 에서 GitHub 계정으로 가입

2. **Railway CLI 설치** (선택사항)
   ```bash
   npm install -g @railway/cli
   railway login
   ```

## 배포 방법

### 방법 1: Railway 웹 대시보드 (권장)

1. **Railway 프로젝트 생성**
   - Railway 대시보드 접속
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - `PolyPang` 레포지토리 선택

2. **서비스 설정**
   - Root Directory: `/server` 설정
   - Build Command: `npm run build`
   - Start Command: `npm run start`

3. **환경 변수 설정**
   Railway 대시보드 → Variables 탭에서 다음 변수 추가:
   
   ```
   NODE_ENV=production
   PORT=3001
   CLIENT_URL=https://your-client-domain.vercel.app
   ```

4. **배포**
   - "Deploy" 버튼 클릭
   - 자동으로 빌드 및 배포 시작

5. **도메인 확인**
   - Settings → Domains에서 자동 생성된 URL 확인
   - 예: `polypang-server-production.up.railway.app`

### 방법 2: Railway CLI

```bash
# 1. 프로젝트 디렉토리로 이동
cd server

# 2. Railway 프로젝트 초기화
railway init

# 3. 환경 변수 설정
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set CLIENT_URL=https://your-client-domain.vercel.app

# 4. 배포
railway up
```

## 환경 변수 목록

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NODE_ENV` | 환경 | `production` |
| `PORT` | 서버 포트 (Railway가 자동 할당) | `3001` |
| `CLIENT_URL` | 클라이언트 도메인 (CORS) | `https://your-app.vercel.app` |

## WebSocket 연결 확인

배포 후 WebSocket 연결 테스트:

```javascript
// 클라이언트 코드
const socket = io('https://polypang-server-production.up.railway.app');

socket.on('connect', () => {
  console.log('Connected to Railway server!');
});
```

## 모니터링

Railway 대시보드에서 확인 가능:
- **Metrics**: CPU, 메모리, 네트워크 사용량
- **Logs**: 실시간 서버 로그
- **Deployments**: 배포 히스토리

## Health Check

배포 후 다음 엔드포인트로 확인:

```bash
curl https://your-railway-domain.railway.app/health
```

응답:
```json
{
  "status": "ok",
  "timestamp": "2025-12-07T06:09:00.000Z",
  "uptime": 123.45
}
```

## 트러블슈팅

### 1. WebSocket 연결 실패
- CLIENT_URL 환경 변수가 올바른지 확인
- CORS 설정 확인

### 2. 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build
```

### 3. 메모리 부족
- Railway Plan 업그레이드 고려
- 무료 Tier: 512MB RAM

## 비용

- **Starter Plan (무료)**: 
  - $5 무료 크레딧/월
  - 500시간 실행 시간
  - 512MB RAM, 1GB 디스크

- **Developer Plan ($5/월)**:
  - 무제한 실행 시간
  - 더 많은 리소스

## 다음 단계

1. 클라이언트를 Vercel에 배포
2. 클라이언트 환경 변수에 Railway 서버 URL 설정
3. E2E 테스트 수행
