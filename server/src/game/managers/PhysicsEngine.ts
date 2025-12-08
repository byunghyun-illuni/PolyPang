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
import { reflect, magnitude, normalize } from '../../utils/geometry';
import { GAME_CONSTANTS, getPaddleRatios } from '../../utils/constants';
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
   * - 반사 (패들 위치에 따른 각도 조정)
   * - 첫 HIT: 정상 속도로 점프
   * - 이후 HIT: 속도 8% 증가
   * - hitCount 증가
   *
   * @param ball - 공
   * @param collision - 충돌 결과
   */
  private handlePaddleHit(
    ball: Ball,
    collision: Extract<CollisionResult, { type: CollisionType.PADDLE_HIT }>
  ): void {
    // 패들 위치에 따른 각도 조정 (paddleOffset: -1 ~ 1)
    const paddleOffset = collision.paddleOffset || 0;
    const deflectStrength = 0.7;

    // 기본 반사
    const reflected = reflect(
      { x: ball.velocity.vx, y: ball.velocity.vy },
      collision.normal
    );

    // tangent 방향 (시계 방향 90도 회전)
    const tangent = { x: collision.normal.y, y: -collision.normal.x };

    // 반사 방향에 패들 오프셋 적용
    const reflectedDir = normalize(reflected);
    const deflection = paddleOffset * deflectStrength;
    const newDir = normalize({
      x: reflectedDir.x + tangent.x * deflection,
      y: reflectedDir.y + tangent.y * deflection,
    });

    // 첫 HIT 처리
    let newSpeed: number;
    if (ball.hitCount === 0) {
      // 첫 HIT: 정상 속도로 점프
      newSpeed = GAME_CONSTANTS.BALL_NORMAL_SPEED;
    } else {
      // 이후 HIT: 속도 8% 증가
      newSpeed = ball.speed * GAME_CONSTANTS.BALL_SPEED_INCREMENT;
    }

    ball.speed = newSpeed;
    ball.velocity.vx = newDir.x * newSpeed;
    ball.velocity.vy = newDir.y * newSpeed;

    // 히트 카운트 증가
    ball.hitCount++;
    ball.lastHitBy = collision.playerId;
  }

  /**
   * 벽 반사 처리
   *
   * - 기본 반사 적용
   * - 최소 각도 보정: 벽에 너무 평행하게 튕기는 것 방지 (루즈한 상황 방지)
   *
   * @param ball - 공
   * @param collision - 충돌 결과
   */
  private handleWallReflect(
    ball: Ball,
    collision: Extract<CollisionResult, { type: CollisionType.WALL_REFLECT }>
  ): void {
    // 반사
    const reflectedVelocity = reflect(
      { x: ball.velocity.vx, y: ball.velocity.vy },
      collision.normal
    );

    const speed = magnitude(reflectedVelocity);
    let dir = normalize(reflectedVelocity);

    // 최소 각도 보정: 벽에 너무 평행하게 튕기는 것 방지
    // 법선 방향 속도 비율 (0~1, 1이면 수직, 0이면 평행)
    const normalComponent = Math.abs(
      dir.x * collision.normal.x + dir.y * collision.normal.y
    );

    // 최소 20도 보장 (sin(20°) ≈ 0.342)
    const minNormalRatio = GAME_CONSTANTS.WALL_MIN_ANGLE_RATIO;

    if (normalComponent < minNormalRatio) {
      // 중앙 방향 벡터 (0,0을 향하는 방향)
      const distToCenter = magnitude(ball.position);
      if (distToCenter > 0.01) {
        const toCenter = normalize({
          x: -ball.position.x,
          y: -ball.position.y,
        });

        // 중앙 방향으로 편향 (부족한 만큼 비례)
        const blendFactor = (minNormalRatio - normalComponent) * 1.5;
        dir = normalize({
          x: dir.x + toCenter.x * blendFactor,
          y: dir.y + toCenter.y * blendFactor,
        });
      }
    }

    ball.velocity.vx = dir.x * speed;
    ball.velocity.vy = dir.y * speed;
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
   * @param n - 플레이어 수
   * @returns Paddle
   */
  initPaddle(playerId: string, sideIndex: number, sideLength: number, n: number): Paddle {
    const { alpha, beta } = getPaddleRatios(n);

    return {
      playerId,
      sideIndex,
      position: 0, // 중앙
      velocity: 0,
      direction: PaddleDirection.STOP,
      length: sideLength * alpha,
      moveRange: beta,
    };
  }
}
