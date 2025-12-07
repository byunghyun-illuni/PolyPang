/**
 * PolyPang 충돌 판정 타입 정의
 * 출처: docs/planning/05_도메인모델.md
 */

import { Vector2D, PlayerId } from './primitives';
import { CollisionType } from './enums';

// Re-export LineSegment for backward compatibility
export type { LineSegment } from './primitives';

/**
 * 충돌 판정 결과 (Discriminated Union)
 *
 * 서버 물리 엔진이 매 틱마다 리턴하는 "공이 무엇과 상호작용했는가" 결과
 */
export type CollisionResult =
  | {
      type: CollisionType.NONE;
    }
  | {
      type: CollisionType.PADDLE_HIT;
      playerId: PlayerId;      // 어느 플레이어 패들인가
      sideIndex: number;       // 어느 Side인가
      hitPoint: Vector2D;      // 충돌 지점
      normal: Vector2D;        // 법선 벡터
      paddleOffset: number;    // 패들 오프셋 (-1 ~ 1)
    }
  | {
      type: CollisionType.WALL_REFLECT;
      sideIndex: number;       // 어느 Side 벽인가
      hitPoint: Vector2D;      // 반사 지점
      normal: Vector2D;        // 법선 벡터
    }
  | {
      type: CollisionType.SIDE_OUT;
      playerId: PlayerId;      // OUT 당한 플레이어
      sideIndex: number;       // OUT 발생 Side
    };

/**
 * 반사 계산 결과
 */
export interface ReflectionResult {
  /** 반사 후 속도 */
  velocity: { vx: number; vy: number };

  /** 반사 각도 (라디안) */
  angle: number;

  /** 속도 크기 (스칼라) */
  speed: number;
}

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
