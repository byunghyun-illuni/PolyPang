# PolyPang Server

**정N각형 경기장 기반 실시간 멀티플레이어 핀볼 생존 게임 서버**

## 📁 프로젝트 구조

```
server/
├── src/
│   ├── game/
│   │   ├── engines/
│   │   │   ├── GameEngine.js            # 베이스 클래스 (기존)
│   │   │   ├── PolyPangEngine.ts        # ✨ PolyPang 게임 엔진 (30fps tick)
│   │   │   └── TicTacToeEngine.js       # 예제 (기존)
│   │   │
│   │   ├── managers/
│   │   │   ├── ArenaManager.ts          # ✨ 정N각형 Arena 관리
│   │   │   ├── PhysicsEngine.ts         # ✨ 물리 시뮬레이션 (30fps)
│   │   │   └── CollisionDetector.ts     # ✨ 충돌 감지
│   │   │
│   │   └── GameRegistry.js              # 게임 등록 (기존)
│   │
│   ├── socket/
│   │   ├── index.js                     # Socket 핸들러 (기존)
│   │   ├── roomHandlers.ts              # ✨ Room 관리 (create, join, leave, ready, start)
│   │   └── inputHandlers.ts             # ✨ 입력 처리 (paddle_move, send_emoji)
│   │
│   ├── types/
│   │   ├── index.ts                     # ✨ 타입 통합 export
│   │   ├── enums.ts                     # ✨ Enum 타입
│   │   ├── primitives.ts                # ✨ 기본 타입
│   │   ├── game.types.ts                # ✨ 게임 엔티티 타입
│   │   └── collision.types.ts           # ✨ 충돌 판정 타입
│   │
│   ├── utils/
│   │   ├── constants.ts                 # ✨ 게임 상수
│   │   ├── geometry.ts                  # ✨ 기하학 계산 (정N각형)
│   │   └── roomCodeGenerator.ts         # ✨ 방 코드 생성
│   │
│   └── index.js                         # 서버 진입점 (기존)
│
└── package.json
```

## 🎮 핵심 기능

### 1. Room 관리
- 6자리 코드 생성 (영문+숫자, I/O/0/1 제외)
- 최대 8명 플레이어
- Host 자동 지정 및 승계
- Ready 상태 관리

### 2. 게임 엔진 (PolyPangEngine)
- **30fps 틱 루프** (33ms 간격)
- 실시간 물리 시뮬레이션
- 충돌 감지 및 처리
- OUT 판정 및 Arena 리메시
- 게임 종료 조건 체크

### 3. 물리 시뮬레이션 (PhysicsEngine)
- Ball 위치/속도 업데이트
- Paddle 이동 (가속도/감속)
- 충돌 감지 (PADDLE_HIT, WALL_REFLECT, SIDE_OUT)
- 반사 계산

### 4. Arena 관리 (ArenaManager)
- 정N각형 좌표 계산
- OUT 시 리메시 (정N → 정(N-1)각형)
- Side/Paddle 재배치

### 5. 충돌 감지 (CollisionDetector)
- Ball-Paddle 충돌
- Ball-Wall 충돌
- Side OUT 판정

## 📡 Socket 이벤트

### Room 관리
- `create_room` → `room_created`, `room_joined`
- `join_room` → `room_joined`, `player_joined`
- `leave_room` → `player_left`, `host_changed`
- `toggle_ready` → `player_ready_changed`
- `start_game` → `game_countdown`, `game_started`

### 게임 진행
- `paddle_move` → `paddle_update`
- 서버 → `game_state_update` (30fps)
- 서버 → `hit_pang` (Ball-Paddle 충돌 시)
- 서버 → `out_pang` (OUT 판정 시)
- 서버 → `player_out`
- 서버 → `arena_remesh_start`, `arena_remesh_complete`
- 서버 → `game_over`

### 기타
- `send_emoji` → `emoji_reaction`

## 🔧 설정

### 환경 변수 (.env)
```bash
PORT=3001
CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### 게임 상수 (constants.ts)
```typescript
ARENA_BASE_RADIUS: 100          // 기본 반지름
PADDLE_LENGTH_RATIO: 0.3        // α: 패들 길이 (Side 대비)
PADDLE_MOVE_RANGE: 0.6          // β: 이동 범위
BALL_INITIAL_SPEED: 0.3         // 초기 속도
BALL_SPEED_INCREMENT: 1.05      // 히트마다 5% 증가
SERVER_TICK_RATE: 30            // 30fps 틱
```

## 🚀 실행 방법

### 개발 모드
```bash
cd server
npm install
npm run dev
```

### 프로덕션
```bash
npm run build
npm start
```

## 📚 참조 문서

모든 설계는 `docs/planning/` 문서를 기반으로 작성되었습니다:

- `01_PRD_게임기획.md` - 게임 규칙, 상태 머신
- `02_PRD_화면기획.md` - UX 원칙
- `03_PRD_Arena상세.md` - Arena 렌더링, 좌표 계산
- `04_기술스택.md` - 아키텍처, 폴더 구조
- `05_도메인모델.md` - TypeScript 타입 정의
- `06_유스케이스.md` - 시나리오
- `07_시퀀스다이어그램.md` - 메시지 흐름
- `08_API명세서.md` - Socket 이벤트 페이로드

## 🧪 테스트

### 단위 테스트
```bash
npm test
```

### E2E 테스트
```bash
npm run test:e2e
```

## 📝 라이선스

MIT

---

**PolyPang Server v1.0.0** - Powered by TypeScript + Socket.io
