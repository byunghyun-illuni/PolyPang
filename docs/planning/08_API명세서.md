# PolyPang API 명세서 (Socket Events)

**목적**: 클라이언트-서버 간 Socket.io 이벤트의 상세 페이로드 및 응답 스펙 정의

**기반 문서**: 
- `05_도메인모델.md` (타입 정의)
- `07_시퀀스다이어그램.md` (메시지 흐름)

---

## 1. 연결 관리 이벤트

### 1.1 connection (시스템)

**방향**: System → Server  
**발생**: Socket 연결 성공 시  
**Payload**: 없음

**서버 동작**:
- Socket ID 할당
- 연결 풀에 추가
- `connection_status` 이벤트 전송

### 1.2 disconnect (시스템)

**방향**: System → Server  
**발생**: Socket 연결 해제 시  
**Payload**: `{ reason: string }`

**서버 동작**:
- 플레이어 상태 `DISCONNECTED`로 변경
- 타임아웃 시작 (5초)
- 5초 내 재연결 없으면 퇴장 처리

### 1.3 ping / pong

**방향**: Client ↔ Server  
**주기**: 3초마다  
**Payload**: `{ timestamp: number }`

**목적**: 핑 측정 및 연결 유지

---

## 2. Room 관리 이벤트

### 2.1 create_room

**방향**: Client → Server  
**트리거**: 플레이어가 "방 만들기" 버튼 클릭

**Request**:
```typescript
{
  nickname: string;      // 1~10자, 영문/숫자/한글
  maxPlayers?: number;   // 기본값: 8, 범위: 2~8
}
```

**Response (Callback)**:
```typescript
{
  success: boolean;
  roomCode?: RoomCode;   // 성공 시: "AB3F9K"
  error?: string;        // 실패 시: "INVALID_NICKNAME"
}
```

**후속 이벤트**:
- `room_created(roomCode)` → 생성자에게
- `room_joined(Room)` → 생성자에게

**에러 코드**:
- `INVALID_NICKNAME`: 닉네임 형식 오류
- `SERVER_ERROR`: 서버 내부 오류

---

### 2.2 join_room

**방향**: Client → Server  
**트리거**: 플레이어가 참가코드 입력 후 "입장" 버튼 클릭

**Request**:
```typescript
{
  roomCode: RoomCode;    // 6자리 영문+숫자
  nickname: string;      // 1~10자
}
```

**Response (Callback)**:
```typescript
{
  success: boolean;
  room?: Room;           // 성공 시: 방 전체 정보
  error?: string;        // 실패 시: 에러 코드
}
```

**후속 이벤트** (성공 시):
- `room_joined(Room)` → 참가자에게
- `player_joined(Player)` → 기존 플레이어들에게

**에러 코드**:
- `INVALID_CODE`: 잘못된 방 코드
- `ROOM_NOT_FOUND`: 존재하지 않는 방
- `ROOM_FULL`: 방 인원 가득 참 (8/8)
- `GAME_IN_PROGRESS`: 게임 이미 시작됨
- `INVALID_NICKNAME`: 닉네임 형식 오류

---

### 2.3 leave_room

**방향**: Client → Server  
**트리거**: 플레이어가 "방 나가기" 버튼 클릭

**Request**: 없음 (Socket ID로 식별)

**Response**: 없음

**후속 이벤트**:
- `player_left(userId, reason)` → 남은 플레이어들에게
- 퇴장자가 Host였으면 → `host_changed(newHostId)`

**특수 케이스**:
- INGAME 중 퇴장: 즉시 OUT 처리 후 퇴장
- 마지막 플레이어 퇴장: 방 자동 삭제

---

### 2.4 toggle_ready

**방향**: Client → Server  
**트리거**: 플레이어가 "Ready" 또는 "Cancel Ready" 버튼 클릭

**Request**: 없음

**Response**: 없음

**후속 이벤트**:
- `player_ready_changed(userId, isReady)` → 모든 플레이어에게

**서버 동작**:
- Player state: `LOBBY_WAIT` ↔ `LOBBY_READY` 토글
- Host의 "게임 시작" 버튼 활성화 조건 체크

---

### 2.5 start_game

**방향**: Client → Server  
**트리거**: Host가 "게임 시작" 버튼 클릭  
**권한**: Host만 가능

**Request**: 없음

**Response**: 없음

**Precondition**:
- 발신자가 Host임
- 인원 2명 이상
- Room state: `LOBBY`

**후속 이벤트**:
1. `game_countdown(3)` → 모든 플레이어
2. `game_countdown(2)` (1초 후)
3. `game_countdown(1)` (1초 후)
4. `game_started(GameState)` (1초 후)

**에러 처리**:
- Host 아님: 무시
- 인원 부족: 무시

---

## 3. Game 상태 이벤트

### 3.1 game_countdown

**방향**: Server → Client  
**발생**: 게임 시작 전 카운트다운

**Payload**:
```typescript
{
  count: number;  // 3, 2, 1
}
```

**클라이언트 동작**:
- 화면 중앙에 큰 숫자 표시
- count === 1일 때 "GO!" 준비

---

### 3.2 game_started

**방향**: Server → Client  
**발생**: 카운트다운 종료 후 게임 시작

**Payload**:
```typescript
{
  gameState: GameState;
}

// GameState 구조
{
  gameId: string;
  roomCode: RoomCode;
  state: RoomState.INGAME;
  arena: Arena;          // 정N각형, N = 플레이어 수
  ball: Ball;            // 초기 위치/속도
  paddles: Record<PlayerId, Paddle>;
  alivePlayers: PlayerId[];
  outPlayers: [];
  tick: 0;
  startedAt: Timestamp;
}
```

**클라이언트 동작**:
- 인게임 화면 (S04) 전환
- Arena, Ball, Paddles 렌더링 시작
- 입력 수신 시작

---

### 3.3 game_state_update

**방향**: Server → Client  
**주기**: 30fps (33ms마다)

**Payload** (Delta 형식):
```typescript
{
  tick?: number;
  ball?: {
    position?: Vector2D;
    velocity?: Velocity;
    speed?: number;
  };
  paddles?: Record<PlayerId, {
    position?: number;
    velocity?: number;
  }>;
  alivePlayers?: PlayerId[];
  outPlayers?: PlayerId[];
}
```

**최적화**:
- 변경된 필드만 전송
- Ball은 매 틱 전송 (필수)
- Paddle은 변경 시만 전송

---

### 3.4 paddle_update

**방향**: Server → Client  
**발생**: 특정 플레이어의 패들 상태 변경 시

**Payload**:
```typescript
{
  userId: PlayerId;
  paddle: {
    position?: number;    // -1 ~ 1
    velocity?: number;
    direction?: PaddleDirection;
  };
}
```

---

### 3.5 ball_update

**방향**: Server → Client  
**발생**: 공 상태 급격한 변화 시 (충돌, 속도 증가)

**Payload**:
```typescript
{
  position: Vector2D;
  velocity: Velocity;
  speed: number;
  hitCount?: number;
}
```

---

## 4. 충돌 & 연출 이벤트

### 4.1 hit_pang

**방향**: Server → Client  
**발생**: Ball-Paddle 충돌 시

**Payload**:
```typescript
{
  type: CollisionType.PADDLE_HIT;
  playerId: PlayerId;
  sideIndex: number;
  hitPoint: Vector2D;
  normal: Vector2D;
}
```

**클라이언트 동작**:
1. HIT Pang 파티클 재생 (hitPoint 위치)
2. 짧은 "팅/핑" 효과음
3. Ball 트레일 강화 (0.3초)

---

### 4.2 out_pang

**방향**: Server → Client  
**발생**: 플레이어 OUT 판정 시

**Payload**:
```typescript
{
  userId: PlayerId;     // OUT 당한 플레이어
  sideIndex: number;    // OUT 발생 Side
}
```

**클라이언트 동작**:
1. OUT Pang 파티클 재생 (Side 위치)
2. Side 조각 흩어지는 애니메이션
3. 카메라 쉐이크 (0.2초)
4. "Pang!" 효과음

---

### 4.3 player_out

**방향**: Server → Client  
**발생**: OUT Pang 직후

**Payload**:
```typescript
{
  userId: PlayerId;
  reason: string;  // "MISS", "DISCONNECT", 등
}
```

**클라이언트 동작**:
- 해당 플레이어 state: `INGAME_ALIVE` → `SPECTATOR`
- 플레이어 리스트 UI 업데이트 (OUT 표시)
- OUT 당한 본인: "OUT!" UI 표시 (1초)

---

### 4.4 arena_remesh_start

**방향**: Server → Client  
**발생**: OUT 직후, Arena 재구성 시작

**Payload**:
```typescript
{
  newArena: Arena;  // 정(N-1)각형 정보
}
```

**클라이언트 동작**:
1. 슬로우모션 시작 (0.5초)
2. 리메시 애니메이션 (0.5초)
   - 기존 Side → 새 Side 위치로 이동
   - OUT Side 사라짐

---

### 4.5 arena_remesh_complete

**방향**: Server → Client  
**발생**: 리메시 애니메이션 완료 시

**Payload**: 없음

**클라이언트 동작**:
- 슬로우모션 종료
- 정상 속도 복귀
- 게임 루프 계속

---

## 5. 게임 입력 이벤트

### 5.1 paddle_move

**방향**: Client → Server  
**주기**: 입력 발생 시마다

**Payload**:
```typescript
{
  direction: PaddleDirection;  // LEFT, RIGHT, STOP
}
```

**서버 동작**:
1. 플레이어 패들에 가속도 적용
2. 위치 업데이트 (이동 범위 체크)
3. `paddle_update` 브로드캐스트 (필요 시)

**우선순위**: High (입력 지연 최소화)

---

### 5.2 send_emoji

**방향**: Client → Server  
**트리거**: 관전자가 이모지 버튼 클릭

**Payload**:
```typescript
{
  emoji: string;  // '👍', '😂', '😱', '🔥'
}
```

**Precondition**:
- Player state: `SPECTATOR`

**후속 이벤트**:
- `emoji_reaction(userId, emoji, position)` → 모든 플레이어

---

## 6. 게임 종료 이벤트

### 6.1 game_over

**방향**: Server → Client  
**발생**: Alive 플레이어 1명 남았을 때

**Payload**:
```typescript
{
  winner: Player;
  ranking: PlayerRanking[];
  stats: GameStats;
}

// PlayerRanking 구조
{
  player: Player;
  rank: number;           // 1~N
  survivalTime: number;   // 생존 시간 (초)
  outReason?: string;     // "MISS", "DISCONNECT"
}

// GameStats 구조
{
  totalDuration: number;    // 총 게임 시간 (초)
  totalHits: number;        // 총 히트 수
  finalBallSpeed: number;   // 최종 공 속도
  playerStats: Record<PlayerId, {
    hitCount: number;
    survivalTime: number;
  }>;
}
```

**클라이언트 동작**:
- 결과 화면 (S06) 전환
- 우승자 강조 표시 (🏆)
- 랭킹 리스트 표시
- 게임 통계 표시

---

## 7. 에러 & 시스템 이벤트

### 7.1 error

**방향**: Server → Client  
**발생**: 에러 발생 시

**Payload**:
```typescript
{
  message: string;  // 사용자에게 표시할 메시지
  code?: string;    // 에러 코드 (디버깅용)
}
```

**에러 코드 목록**:
- `INVALID_NICKNAME`: 닉네임 형식 오류
- `INVALID_CODE`: 방 코드 오류
- `ROOM_NOT_FOUND`: 방 없음
- `ROOM_FULL`: 방 인원 가득
- `GAME_IN_PROGRESS`: 게임 진행 중
- `PERMISSION_DENIED`: 권한 없음 (Host 전용 액션)
- `SERVER_ERROR`: 서버 오류

**클라이언트 동작**:
- 토스트 메시지 표시 (2~3초)
- 심각한 에러는 모달로 표시

---

### 7.2 connection_status

**방향**: Server → Client  
**주기**: 핑 측정 시 또는 상태 변경 시

**Payload**:
```typescript
{
  connected: boolean;
  ping?: number;        // ms
  quality: 'excellent' | 'good' | 'poor' | 'disconnected';
}
```

**Quality 기준**:
- `excellent`: ping < 50ms
- `good`: ping < 100ms
- `poor`: ping < 300ms
- `disconnected`: ping > 300ms 또는 연결 끊김

**클라이언트 동작**:
- UI에 연결 상태 아이콘 표시
- poor/disconnected 시 경고 표시

---

## 8. 이벤트 빈도 & 우선순위

| 이벤트 | 방향 | 빈도 | 우선순위 | 대역폭 | 비고 |
|--------|------|------|----------|--------|------|
| `paddle_move` | C→S | 입력 시 | High | Low | 입력 지연 최소화 |
| `game_state_update` | S→C | 30fps | High | Medium | Delta 압축 |
| `ball_update` | S→C | 30fps | High | Medium | 포함: state_update |
| `paddle_update` | S→C | 변경 시 | Medium | Low | 변경 시만 |
| `hit_pang` | S→C | 충돌 시 | Low | Low | 연출용 |
| `out_pang` | S→C | OUT 시 | High | Low | 중요 이벤트 |
| `game_countdown` | S→C | 1fps×3초 | Medium | Low | 시작 연출 |
| `emoji_reaction` | S→C | 가끔 | Low | Low | 관전자용 |

---

## 9. WebSocket 프로토콜 스펙

### 9.1 연결

- **URL**: `ws://localhost:3001` (개발), `wss://api.polypang.com` (프로덕션)
- **Path**: `/socket.io`
- **Namespace**: `/` (기본)

### 9.2 핸드셰이크

```typescript
// 클라이언트 연결 시
socket.connect();

// 서버 응답
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

### 9.3 재연결

- **최대 시도**: 5회
- **간격**: 2초
- **Timeout**: 5초

---

## 10. 구현 체크리스트

### 서버 (필수 구현)
- [ ] create_room
- [ ] join_room
- [ ] leave_room
- [ ] toggle_ready
- [ ] start_game (Host 권한 체크)
- [ ] game_countdown (타이머)
- [ ] game_started (초기 상태 생성)
- [ ] game_state_update (30fps tick)
- [ ] paddle_move (입력 처리)
- [ ] hit_pang (충돌 감지)
- [ ] out_pang (OUT 판정)
- [ ] player_out (상태 변경)
- [ ] arena_remesh_start (리메시)
- [ ] arena_remesh_complete (리메시 완료)
- [ ] game_over (종료 조건)
- [ ] error (에러 처리)
- [ ] connection_status (핑 측정)

### 클라이언트 (필수 구현)
- [ ] create_room 요청 + 콜백 처리
- [ ] join_room 요청 + 에러 처리
- [ ] leave_room 요청
- [ ] toggle_ready 요청
- [ ] start_game 요청 (Host만)
- [ ] paddle_move 전송 (입력 핸들링)
- [ ] game_countdown 수신 (UI 표시)
- [ ] game_started 수신 (화면 전환)
- [ ] game_state_update 수신 (렌더링)
- [ ] hit_pang 수신 (이펙트 재생)
- [ ] out_pang 수신 (이펙트 재생)
- [ ] player_out 수신 (상태 업데이트)
- [ ] arena_remesh 수신 (애니메이션)
- [ ] game_over 수신 (결과 화면)
- [ ] error 수신 (토스트 표시)
- [ ] send_emoji 전송 (관전자)

---

## 다음 단계

1. 서버 Socket 핸들러 구현 (`server/src/socket/`)
2. 클라이언트 Socket 훅 구현 (`client/src/hooks/useSocketEvents.ts`)
3. E2E 테스트로 이벤트 흐름 검증
