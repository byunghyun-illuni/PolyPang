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
    // 각 Side에 대해 충돌 검사 (거리 기반 OUT 판정은 Side별로 처리)
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
    // 부호 있는 거리 계산 (외향 법선 기준)
    // signedDistance > 0: 공이 Side 바깥쪽
    // signedDistance < 0: 공이 Side 안쪽 (Arena 내부)
    const ballToSideCenter = {
      x: ball.position.x - side.center.x,
      y: ball.position.y - side.center.y,
    };
    const signedDistance = dot(ballToSideCenter, side.normal);

    // 공의 표면이 Side에 닿았는지 확인
    // 공이 안쪽(signedDistance < 0)에서 접근할 때:
    // - 표면 위치 = signedDistance + ball.radius
    // - 표면이 Side에 닿음: signedDistance + ball.radius >= 0
    // - 즉, signedDistance >= -ball.radius
    if (signedDistance < -ball.radius) {
      return { type: CollisionType.NONE };  // 공이 아직 Side에 닿지 않음
    }

    // Side 선분의 범위 체크 (코너 처리)
    const distanceToSide = distanceToSegment(ball.position, {
      start: side.start,
      end: side.end,
    });
    if (distanceToSide > ball.radius) {
      return { type: CollisionType.NONE };  // 공이 Side 범위 밖 (코너 영역)
    }

    // 공이 Side를 향해 이동 중인지 확인 (법선 벡터와 속도 벡터 내적)
    // 외향 법선: velocityDotNormal > 0 = 벽 쪽으로 이동 중
    const velocityDotNormal = dot(
      { x: ball.velocity.vx, y: ball.velocity.vy },
      side.normal
    );

    // 공이 Side로부터 멀어지거나 평행하면 무시 (외향 법선 기준: <= 0)
    // 클라이언트와 동일한 조건 사용
    if (velocityDotNormal <= 0) {
      return { type: CollisionType.NONE };
    }

    // Side에 플레이어가 있는지 확인
    if (!side.playerId) {
      // 플레이어 없는 Side = 벽 → WALL_REFLECT
      return {
        type: CollisionType.WALL_REFLECT,
        sideIndex: side.index,
        hitPoint: { ...ball.position },
        normal: { ...side.normal },
      };
    }

    const paddle = paddles.get(side.playerId);
    if (!paddle) {
      // 패들 없음 (봇 등) → SIDE_OUT
      return {
        type: CollisionType.SIDE_OUT,
        playerId: side.playerId,
        sideIndex: side.index,
      };
    }

    // 패들 범위 계산
    const paddleHalfLength = paddle.length / 2;
    // paddle.position: -moveRange ~ moveRange (즉 -beta ~ beta)
    // 클라이언트는 -1~1 범위를 사용하지만 offset 계산 시 beta를 곱하므로 결과는 동일
    const paddleCenterPos = paddle.position;

    // 패들 중심의 절대 좌표
    const paddleCenterWorld = {
      x: side.center.x + side.tangent.x * paddleCenterPos * (side.length / 2),
      y: side.center.y + side.tangent.y * paddleCenterPos * (side.length / 2),
    };

    // 공이 패들과 충돌했는지 확인
    // 패들 탄젠트 방향으로의 상대 위치 계산
    const ballToPaddleCenter = {
      x: ball.position.x - paddleCenterWorld.x,
      y: ball.position.y - paddleCenterWorld.y,
    };

    // 패들 탄젠트 방향으로의 투영 (패들 어디를 맞췄는지)
    const projectionOnTangent = dot(ballToPaddleCenter, side.tangent);

    // 패들 법선 방향으로의 거리
    const distanceToLine = Math.abs(dot(ballToPaddleCenter, side.normal));

    // 패들 두께 고려 (클라이언트와 일치: ball.radius의 50% 추가)
    // 클라이언트는 paddleThickness=4, ballRadius≈8 → 50% 비율
    const paddleThickness = ball.radius * 0.5;
    if (Math.abs(projectionOnTangent) <= paddleHalfLength && distanceToLine <= ball.radius + paddleThickness) {
      // PADDLE_HIT
      // paddleOffset: -1(왼쪽) ~ 0(중앙) ~ 1(오른쪽)
      const paddleOffset = paddleHalfLength > 0
        ? -projectionOnTangent / paddleHalfLength  // 부호 반전 (Arena 회전 고려)
        : 0;

      return {
        type: CollisionType.PADDLE_HIT,
        playerId: side.playerId,
        sideIndex: side.index,
        hitPoint: { ...ball.position },
        normal: { ...side.normal },
        paddleOffset: Math.max(-1, Math.min(1, paddleOffset)),
      };
    }

    // 패들 범위 밖에서 Side에 닿음 → OUT! (패들이 있는 Side에서 패들을 못 막음)
    // 공이 Side 선분 근처에 있음 (distanceToSide <= ball.radius 조건 이미 통과)
    return {
      type: CollisionType.SIDE_OUT,
      playerId: side.playerId,
      sideIndex: side.index,
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
