import type { Vector2D } from './index';

/**
 * 정N각형 계산 파라미터
 */
export interface PolygonParams {
  /** 변의 개수 (플레이어 수) */
  n: number;

  /** 반지름 */
  radius: number;

  /** 회전 각도 (라디안, 기본: -π/2 = 12시 방향) */
  rotation?: number;
}

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

/**
 * AABB (충돌 최적화용)
 */
export interface AABB {
  min: Vector2D;
  max: Vector2D;
}
