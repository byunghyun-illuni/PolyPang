import type { CollisionType, Vector2D, Velocity, PlayerId, Timestamp } from './index';

/**
 * 충돌 결과
 */
export interface CollisionResult {
  /** 충돌 타입 */
  type: CollisionType;

  /** 충돌 지점 */
  point: Vector2D;

  /** 충돌 법선 벡터 */
  normal: Vector2D;

  /** 충돌한 Side 인덱스 (해당 시) */
  sideIndex?: number;

  /** 충돌한 플레이어 ID (패들 히트 시) */
  playerId?: PlayerId;

  /** 충돌 시간 (틱 기준) */
  timestamp: Timestamp;
}

/**
 * 반사 계산 결과
 */
export interface ReflectionResult {
  /** 반사 후 속도 */
  velocity: Velocity;

  /** 반사 각도 (라디안) */
  angle: number;

  /** 속도 크기 (스칼라) */
  speed: number;
}

/**
 * 레이캐스트 결과
 */
export interface RaycastHit {
  /** 히트 여부 */
  hit: boolean;

  /** 히트 지점 */
  point?: Vector2D;

  /** 히트 거리 */
  distance?: number;

  /** 히트한 Side 인덱스 */
  sideIndex?: number;
}
