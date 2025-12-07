import type { Vector2D, Velocity, PlayerId, Timestamp } from './index';

/**
 * 공
 */
export interface Ball {
  /** 공 위치 */
  position: Vector2D;

  /** 공 속도 */
  velocity: Velocity;

  /** 공 반지름 */
  radius: number;

  /** 현재 속도 크기 (스칼라) */
  speed: number;

  /** 초기 속도 (v0) */
  baseSpeed: number;

  /** 속도 증가 횟수 (히트 카운트) */
  hitCount: number;

  /** 마지막 히트 플레이어 ID */
  lastHitBy?: PlayerId;

  /** 마지막 히트 시간 */
  lastHitAt?: Timestamp;
}

/**
 * 공 초기화 파라미터
 */
export interface BallInitParams {
  /** 초기 위치 (기본: 중앙) */
  position?: Vector2D;

  /** 초기 발사 각도 (라디안) */
  angle?: number;

  /** 초기 속도 크기 */
  baseSpeed: number;

  /** 공 반지름 */
  radius: number;
}
