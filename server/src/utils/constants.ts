/**
 * PolyPang 게임 상수
 * 출처: docs/planning/01_PRD_게임기획.md, 04_기술스택.md
 */

export const GAME_CONSTANTS = {
  // Arena
  ARENA_RADIUS_RATIO: 0.38,        // ArenaView 대비 반지름 비율
  ARENA_BASE_RADIUS: 100,          // 기본 반지름 (서버 기준, 클라는 스케일링)

  // Paddle
  PADDLE_LENGTH_RATIO: 0.3,        // α: Side 길이 대비 패들 길이
  PADDLE_MOVE_RANGE: 0.6,          // β: Side 중심 기준 이동 범위
  PADDLE_MAX_SPEED: 0.8,           // 최대 이동 속도 (Side 길이/초)
  PADDLE_ACCELERATION: 2.0,        // 가속도
  PADDLE_DECELERATION: 0.9,        // 감속 계수

  // Ball
  BALL_INITIAL_SPEED: 0.3,         // 초기 속도 (R/초)
  BALL_SPEED_INCREMENT: 1.05,      // HIT마다 5% 증가
  BALL_RADIUS_RATIO: 0.03,         // Arena 대비 공 크기

  // Timing
  COUNTDOWN_SECONDS: 3,
  OUT_SLOWMO_DURATION: 0.5,        // 슬로우모션 지속 (초)
  REMESH_ANIMATION_DURATION: 0.5,  // 리메시 애니메이션 (초)

  // Network
  SERVER_TICK_RATE: 30,            // 서버 초당 틱
  CLIENT_RENDER_FPS: 60,           // 클라이언트 렌더링
  RECONNECT_MAX_ATTEMPTS: 5,       // 재연결 최대 시도
  RECONNECT_INTERVAL: 2000,        // 재연결 간격 (ms)
  DISCONNECT_TIMEOUT: 5000,        // 연결 끊김 타임아웃 (ms)

  // Room
  ROOM_CODE_LENGTH: 6,             // 방 코드 길이
  MAX_PLAYERS: 8,                  // 최대 플레이어 수
  MIN_PLAYERS: 2,                  // 최소 플레이어 수

  // Physics
  DT: 1 / 30,                      // 물리 틱 간격 (초)
} as const;

/**
 * 플레이어 색상 팔레트
 * 출처: docs/planning/03_PRD_Arena상세.md
 */
export const PLAYER_COLORS = [
  '#EF4444', // P1 빨강
  '#F97316', // P2 주황
  '#EAB308', // P3 노랑
  '#22C55E', // P4 초록
  '#06B6D4', // P5 청록
  '#3B82F6', // P6 파랑
  '#8B5CF6', // P7 보라
  '#EC4899', // P8 분홍
] as const;

/**
 * 방 코드 생성용 문자 집합
 */
export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // I, O, 0, 1 제외
