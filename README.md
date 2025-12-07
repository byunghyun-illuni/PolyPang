# PolyPang

**정N각형 경기장 실시간 멀티플레이어 생존 게임**

## 프로젝트 소개

PolyPang은 2~8명의 플레이어가 정N각형 경기장에서 공을 패들로 튕겨내며 생존하는 실시간 웹 게임입니다. 플레이어가 OUT될 때마다 경기장이 "Pang!"하며 축소되는 독특한 게임플레이가 특징입니다.

### 핵심 특징

- **동적 경기장**: 플레이어 탈락 시 정N각형 → 정(N-1)각형으로 자동 재구성
- **가속 시스템**: 패들 히트마다 공 속도 5% 증가로 긴장감 상승
- **Pang 연출**: HIT/OUT 시 파티클 이펙트와 카메라 쉐이크
- **관전 모드**: 탈락 후에도 게임 관전 및 이모지 리액션 가능

## 기술 스택

### Frontend
- **React** + TypeScript
- **PixiJS** (WebGL 기반 2D 렌더링)
- **Zustand** (상태 관리)
- **Tailwind CSS** (UI 스타일링)
- **Vite** (빌드 툴)

### Backend
- **Node.js** + Express
- **Socket.io** (실시간 통신)
- **Server Authoritative Physics** (30fps tick)

## 프로젝트 구조

```
PolyPang/
├── client/              # React 프론트엔드
│   ├── src/
│   │   ├── components/  # UI 컴포넌트
│   │   ├── stores/      # Zustand 스토어
│   │   ├── hooks/       # Custom Hooks
│   │   ├── physics/     # 물리 계산 로직
│   │   └── types/       # TypeScript 타입 정의
│   └── package.json
│
├── server/              # Node.js 백엔드
│   ├── src/
│   │   ├── game/        # 게임 엔진
│   │   ├── socket/      # Socket 핸들러
│   │   └── types/       # 타입 정의
│   └── package.json
│
└── docs/                # 프로젝트 문서
    └── planning/        # 기획 문서
        ├── 01_PRD_게임기획.md
        ├── 02_PRD_화면기획.md
        ├── 03_PRD_Arena상세.md
        ├── 04_기술스택.md
        ├── 05_도메인모델.md
        ├── 06_유스케이스.md
        ├── 07_시퀀스다이어그램.md
        └── 08_API명세서.md
```

## 시작하기

### 개발 환경 요구사항

- Node.js v18+
- npm or yarn

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/yourusername/PolyPang.git
cd PolyPang
```

2. **서버 설정**
```bash
cd server
npm install
cp .env.example .env
npm run dev
```
> 서버가 `http://localhost:3001`에서 실행됩니다.

3. **클라이언트 설정** (새 터미널)
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

4. **브라우저에서 접속**
```
http://localhost:5173
```

## 개발 로드맵

### Phase 1: 인프라 구축 (완료 예정)
- [ ] Vite + TypeScript 프로젝트 설정
- [ ] PixiJS ArenaCanvas 기본 렌더링
- [ ] Zustand 스토어 구조 설계
- [ ] Socket.io 클라이언트/서버 연결

### Phase 2: 게임 로직 (진행 중)
- [ ] 정N각형 좌표 계산 (geometry.ts)
- [ ] 서버 물리 엔진 (공 이동, 반사)
- [ ] 패들 입력 처리
- [ ] OUT 판정 및 Arena 리메시

### Phase 3: 연출 및 폴리싱
- [ ] HIT/OUT Pang 파티클 이펙트
- [ ] 경기장 리메시 애니메이션
- [ ] 사운드 통합
- [ ] 화면 전환 애니메이션

### Phase 4: 최적화 및 QA
- [ ] 성능 프로파일링
- [ ] 모바일 최적화
- [ ] 네트워크 지연 테스트

## 문서

자세한 게임 기획 및 기술 명세는 `docs/planning/` 폴더를 참조하세요:

- **게임 기획**: 게임 룰, 플로우, 튜닝값
- **화면 기획**: S01~S06 화면 구조
- **Arena 상세**: 정N각형 렌더링 및 좌표 계산
- **기술 스택**: 아키텍처 및 프레임워크 선정 근거
- **도메인 모델**: TypeScript 타입 정의
- **유스케이스**: 10개 주요 시나리오
- **시퀀스 다이어그램**: 클라이언트-서버 메시지 흐름
- **API 명세서**: Socket.io 이벤트 페이로드 스펙

## 라이선스

MIT

---

**템플릿 출처**: https://github.com/ajejey/multiplayer-game-template
