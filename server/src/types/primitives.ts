/**
 * PolyPang 기본 타입 정의
 * 출처: docs/planning/05_도메인모델.md
 */

/**
 * 2D 벡터
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * 속도 벡터
 */
export interface Velocity {
  vx: number;
  vy: number;
}

/**
 * 색상 (Hex)
 */
export type Color = string; // '#FF5733'

/**
 * 플레이어 ID (UUID)
 */
export type PlayerId = string;

/**
 * 방 코드 (6자리 영문+숫자)
 */
export type RoomCode = string; // 'AB3F9K'

/**
 * 타임스탬프 (ISO 8601)
 */
export type Timestamp = string; // '2024-01-01T00:00:00.000Z'

/**
 * 선분
 */
export interface LineSegment {
  start: Vector2D;
  end: Vector2D;
}

/**
 * 원 (Ball 등)
 */
export interface Circle {
  center: Vector2D;
  radius: number;
}
