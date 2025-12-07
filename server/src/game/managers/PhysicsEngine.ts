/**
 * PolyPang 물리 엔진 (30fps tick)
 * 출처: docs/planning/01_PRD_게임기획.md (섹션 5), 04_기술스택.md
 *
 * 역할:
 * 1. Ball 위치 업데이트
 * 2. Paddle 위치 업데이트
 * 3. 충돌 감지 및 처리
 * 4. OUT 판정
 */

import { GameState, Ball, Paddle } from '../../types/game.types';
import { CollisionDetector } from './CollisionDetector';
import { CollisionType, CollisionResult } from '../../types';
import { reflect, magnitude } from '../../utils/geometry';
import { GAME_CONSTANTS } from '../../utils/constants';
import { PaddleDirection } from '../../types/enums';

export class PhysicsEngine {
  private collisionDetector: CollisionDetector;
  private dt: number; // Delta time (초)

  constructor() {
    this.collisionDetector = new CollisionDetector();
    this.dt = GAME_CONSTANTS.DT; // 1/30 초
  }

  /**
   * 물리 시뮬레이션 1 틱 실행
   *
   * @param gameState - 게임 상태
   * @returns 충돌 결과
   */
  tick(gameState: GameState): CollisionResult {
    // 1. 패들 위치 업데이트
    this.updatePaddles(gameState);

    // 2. 공 위치 업데이트
    this.updateBall(gameState.ball, this.dt);

    // 3. 충돌 감지
    const collision = this.collisionDetector.detectCollision(
      gameState.ball,
      gameState.arena,
      gameState.paddles
    );

    // 4. 충돌 처리
    this.handleCollision(gameState, collision);

    return collision;
  }

  /**
   * 공 위치 업데이트
   *
   * @param ball - 공
   * @param dt - Delta time (초)
   */
  private updateBall(ball: Ball, dt: number): void {
    ball.position.x += ball.velocity.vx * dt;
    ball.position.y += ball.velocity.vy * dt;
  }

  /**
   * 패들 위치 업데이트 (가속도/감속)
   *
   * @param gameState - 게임 상태
   */
  private updatePaddles(gameState: GameState): void {
    for (const paddle of gameState.paddles.values()) {
      // 입력 방향에 따라 가속도 적용
      let acceleration = 0;
      if (paddle.direction === PaddleDirection.LEFT) {
        acceleration = -GAME_CONSTANTS.PADDLE_ACCELERATION;
      } else if (paddle.direction === PaddleDirection.RIGHT) {
        acceleration = GAME_CONSTANTS.PADDLE_ACCELERATION;
      } else {
        // STOP: 감속
        paddle.velocity *= GAME_CONSTANTS.PADDLE_DECELERATION;
        if (Math.abs(paddle.velocity) < 0.01) {
          paddle.velocity = 0;
        }
      }

      // 속도 업데이트
      paddle.velocity += acceleration * this.dt;

      // 최대 속도 제한
      const maxSpeed = GAME_CONSTANTS.PADDLE_MAX_SPEED;
      if (paddle.velocity > maxSpeed) paddle.velocity = maxSpeed;
      if (paddle.velocity < -maxSpeed) paddle.velocity = -maxSpeed;

      // 위치 업데이트
      paddle.position += paddle.velocity * this.dt;

      // 이동 범위 제한 (-1 ~ 1)
      const range = paddle.moveRange;
      if (paddle.position > range) paddle.position = range;
      if (paddle.position < -range) paddle.position = -range;
    }
  }

  /**
   * 충돌 처리
   *
   * @param gameState - 게임 상태
   * @param collision - 충돌 결과
   */
  private handleCollision(gameState: GameState, collision: CollisionResult): void {
    switch (collision.type) {
      case CollisionType.PADDLE_HIT:
        this.handlePaddleHit(gameState.ball, collision);
        break;

      case CollisionType.WALL_REFLECT:
        this.handleWallReflect(gameState.ball, collision);
        break;

      case CollisionType.SIDE_OUT:
        // OUT 판정은 게임 엔진에서 처리
        break;

      case CollisionType.NONE:
        // 아무 처리 없음
        break;
    }
  }

  /**
   * 패들 히트 처리
   *
   * - 반사
   * - 속도 5% 증가
   * - hitCount 증가
   *
   * @param ball - 공
   * @param collision - 충돌 결과
   */
  private handlePaddleHit(
    ball: Ball,
    collision: Extract<CollisionResult, { type: CollisionType.PADDLE_HIT }>
  ): void {
    // 반사
    const reflectedVelocity = reflect(
      { x: ball.velocity.vx, y: ball.velocity.vy },
      collision.normal
    );

    ball.velocity.vx = reflectedVelocity.x;
    ball.velocity.vy = reflectedVelocity.y;

    // 속도 5% 증가
    ball.speed *= GAME_CONSTANTS.BALL_SPEED_INCREMENT;
    const speed = ball.speed;
    const currentSpeed = magnitude({ x: ball.velocity.vx, y: ball.velocity.vy });

    if (currentSpeed > 0) {
      ball.velocity.vx = (ball.velocity.vx / currentSpeed) * speed;
      ball.velocity.vy = (ball.velocity.vy / currentSpeed) * speed;
    }

    // 히트 카운트 증가
    ball.hitCount++;
    ball.lastHitBy = collision.playerId;
  }

  /**
   * 벽 반사 처리
   *
   * @param ball - 공
   * @param collision - 충돌 결과
   */
  private handleWallReflect(
    ball: Ball,
    collision: Extract<CollisionResult, { type: CollisionType.WALL_REFLECT }>
  ): void {
    // 반사 (속도 증가 없음)
    const reflectedVelocity = reflect(
      { x: ball.velocity.vx, y: ball.velocity.vy },
      collision.normal
    );

    ball.velocity.vx = reflectedVelocity.x;
    ball.velocity.vy = reflectedVelocity.y;
  }

  /**
   * 공 초기화 (게임 시작 시)
   *
   * @param radius - Arena 반지름
   * @param n - 플레이어 수
   * @returns Ball
   */
  initBall(radius: number, n: number): Ball {
    // 초기 위치: 중앙
    const position = { x: 0, y: 0 };

    // 초기 각도: 모든 플레이어 Side 중심각에서 ±15° 이상 떨어진 값
    const forbiddenAngles = [];
    for (let i = 0; i < n; i++) {
      const sideAngle = ((360 / n) * i - 90) * (Math.PI / 180);
      forbiddenAngles.push(sideAngle);
    }

    // 랜덤 각도 선택 (금지 구역 회피)
    let angle = Math.random() * 2 * Math.PI;
    const minAngleDiff = (15 * Math.PI) / 180; // 15도

    // 금지 구역과 충분히 떨어진 각도 찾기
    let attempts = 0;
    while (attempts < 100) {
      let isSafe = true;
      for (const forbiddenAngle of forbiddenAngles) {
        const diff = Math.abs(angle - forbiddenAngle);
        if (diff < minAngleDiff || diff > 2 * Math.PI - minAngleDiff) {
          isSafe = false;
          break;
        }
      }

      if (isSafe) break;
      angle = Math.random() * 2 * Math.PI;
      attempts++;
    }

    // 초기 속도
    const speed = GAME_CONSTANTS.BALL_INITIAL_SPEED * radius;
    const velocity = {
      vx: speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
    };

    return {
      position,
      velocity,
      speed,
      radius: GAME_CONSTANTS.BALL_RADIUS_RATIO * radius,
      hitCount: 0,
    };
  }

  /**
   * 패들 초기화
   *
   * @param playerId - 플레이어 ID
   * @param sideIndex - Side 인덱스
   * @param sideLength - Side 길이
   * @returns Paddle
   */
  initPaddle(playerId: string, sideIndex: number, sideLength: number): Paddle {
    return {
      playerId,
      sideIndex,
      position: 0, // 중앙
      velocity: 0,
      direction: PaddleDirection.STOP,
      length: sideLength * GAME_CONSTANTS.PADDLE_LENGTH_RATIO,
      moveRange: GAME_CONSTANTS.PADDLE_MOVE_RANGE,
    };
  }
}
