/**
 * PolyPang 서버 Enum 타입 정의
 * 출처: docs/planning/05_도메인모델.md
 */

/**
 * 방 상태
 */
export enum RoomState {
  LOBBY = 'LOBBY',           // 로비 (인원 모집 중)
  COUNTDOWN = 'COUNTDOWN',   // 카운트다운 (3초)
  INGAME = 'INGAME',         // 게임 진행 중
  RESULT = 'RESULT',         // 결과 화면
}

/**
 * 플레이어 상태
 */
export enum PlayerState {
  LOBBY_WAIT = 'LOBBY_WAIT',       // 로비 대기 (Ready 전)
  LOBBY_READY = 'LOBBY_READY',     // Ready 상태
  INGAME_ALIVE = 'INGAME_ALIVE',   // 게임 중 생존
  INGAME_OUT = 'INGAME_OUT',       // OUT 판정 직후 (연출 중)
  SPECTATOR = 'SPECTATOR',         // 관전자 모드
  DISCONNECTED = 'DISCONNECTED',   // 연결 끊김
}

/**
 * 패들 입력 방향
 */
export enum PaddleDirection {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  STOP = 'STOP',
}

/**
 * 충돌 타입
 *
 * 물리 엔진이 매 틱마다 "공이 무엇과 상호작용했는가"를 분류하는 타입
 */
export enum CollisionType {
  NONE = 'NONE',                   // 충돌 없음 (자유 이동)
  PADDLE_HIT = 'PADDLE_HIT',       // 패들 히트 → 반사 + 속도 증가 + HIT Pang
  WALL_REFLECT = 'WALL_REFLECT',   // 벽 반사 (패들 없는 Side 구간)
  SIDE_OUT = 'SIDE_OUT',           // Side 이탈 (미스 판정) → OUT Pang
}
