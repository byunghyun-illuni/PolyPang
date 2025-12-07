/**
 * PolyPang 충돌 감지 시스템
 * 출처: docs/planning/01_PRD_게임기획.md (섹션 5.4, 13.2)
 *
 * 판정 우선순위:
 * 1. Paddle 범위 내 → PADDLE_HIT
 * 2. Paddle 범위 밖 선분 → WALL_REFLECT
 * 3. 선분 완전 통과 → SIDE_OUT
 */

import { Ball, Paddle, Arena, Side } from '../../types/game.types';
import { CollisionResult, CollisionType } from '../../types';
import { distanceToSegment, dot } from '../../utils/geometry';

export class CollisionDetector {
  /**
   * 충돌 감지 (매 틱마다 호출)
   *
   * @param ball - 공
   * @param arena - 경기장
   * @param paddles - 패들 맵
   * @returns 충돌 결과
   */
  detectCollision(
    ball: Ball,
    arena: Arena,
    paddles: Map<string, Paddle>
  ): CollisionResult {
    // 각 Side에 대해 충돌 검사
    for (const side of arena.sides) {
      const collision = this.checkSideCollision(ball, side, paddles);
      if (collision.type !== CollisionType.NONE) {
        return collision;
      }
    }

    return { type: CollisionType.NONE };
  }

  /**
   * 특정 Side와 공의 충돌 검사
   *
   * @param ball - 공
   * @param side - Side
   * @param paddles - 패들 맵
   * @returns 충돌 결과
   */
  private checkSideCollision(
    ball: Ball,
    side: Side,
    paddles: Map<string, Paddle>
  ): CollisionResult {
    const distanceToSide = distanceToSegment(ball.position, {
      start: side.start,
      end: side.end,
    });

    // 공이 Side와 충돌하지 않음
    if (distanceToSide > ball.radius) {
      return { type: CollisionType.NONE };
    }

    // 공이 Side를 향해 이동 중인지 확인 (법선 벡터와 속도 벡터 내적)
    const velocityDotNormal = dot(
      { x: ball.velocity.vx, y: ball.velocity.vy },
      side.normal
    );

    // 공이 Side로부터 멀어지는 중이면 무시
    if (velocityDotNormal > 0) {
      return { type: CollisionType.NONE };
    }

    // Side에 플레이어가 있는지 확인
    if (!side.playerId) {
      // OUT 상태 Side (이미 제거됨)
      return { type: CollisionType.NONE };
    }

    const paddle = paddles.get(side.playerId);
    if (!paddle) {
      // 패들 없음 → SIDE_OUT
      return {
        type: CollisionType.SIDE_OUT,
        playerId: side.playerId,
        sideIndex: side.index,
      };
    }

    // 패들 범위 계산
    const paddleHalfLength = paddle.length / 2;
    const paddleCenterPos = paddle.position; // -1 ~ 1

    // 패들 중심의 절대 좌표
    const paddleCenterWorld = {
      x: side.center.x + side.tangent.x * paddleCenterPos * (side.length / 2),
      y: side.center.y + side.tangent.y * paddleCenterPos * (side.length / 2),
    };

    // 공이 패들과 충돌했는지 확인
    const distanceToPaddleCenter = Math.sqrt(
      (ball.position.x - paddleCenterWorld.x) ** 2 +
        (ball.position.y - paddleCenterWorld.y) ** 2
    );

    if (distanceToPaddleCenter <= paddleHalfLength + ball.radius) {
      // PADDLE_HIT
      return {
        type: CollisionType.PADDLE_HIT,
        playerId: side.playerId,
        sideIndex: side.index,
        hitPoint: { ...ball.position },
        normal: { ...side.normal },
      };
    }

    // 공이 Side를 통과했는지 확인 (OUT 판정)
    // Ball이 Side 경계선 너머로 이동했으면 OUT
    const ballCenterToSideCenter = {
      x: ball.position.x - side.center.x,
      y: ball.position.y - side.center.y,
    };

    const distanceFromCenter = dot(ballCenterToSideCenter, side.normal);

    // 공이 Side 바깥으로 나갔으면 OUT
    if (distanceFromCenter > ball.radius) {
      return {
        type: CollisionType.SIDE_OUT,
        playerId: side.playerId,
        sideIndex: side.index,
      };
    }

    // 벽 반사 (패들 없는 Side 구간)
    return {
      type: CollisionType.WALL_REFLECT,
      sideIndex: side.index,
      hitPoint: { ...ball.position },
      normal: { ...side.normal },
    };
  }

  /**
   * 코너 근처 충돌 처리 (향후 사용)
   *
   * 정점에서 ±5° 이내는 두 Side 중 가까운 쪽으로 판정
   *
   * @param ball - 공
   * @param arena - 경기장
   * @returns 가장 가까운 Side 인덱스
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _findClosestSide(ball: Ball, arena: Arena): number {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < arena.sides.length; i++) {
      const distance = distanceToSegment(ball.position, {
        start: arena.sides[i].start,
        end: arena.sides[i].end,
      });

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }
}
