/**
 * 충돌 감지 유틸리티
 *
 * 역할:
 * - 공-선분 충돌 감지
 * - 공-패들 충돌 감지
 * - 충돌 지점 계산
 *
 * 출처: docs/planning/01_PRD_게임기획.md
 */

import type { Vector2D } from '@/types'
import { subtract, dot, magnitude, multiply, add } from './vector'

/**
 * 선분 정의
 */
export interface LineSegment {
  /** 시작점 */
  start: Vector2D
  /** 끝점 */
  end: Vector2D
}

/**
 * 충돌 결과
 */
export interface CollisionResult {
  /** 충돌 여부 */
  collided: boolean
  /** 충돌 지점 (충돌 시) */
  point?: Vector2D
  /** 충돌 거리 (0~1, start에서 end로의 비율) */
  t?: number
}

/**
 * 공과 선분의 충돌 감지
 *
 * @param ballPos - 공 위치
 * @param ballRadius - 공 반지름
 * @param segment - 선분
 * @returns 충돌 결과
 */
export function checkBallLineCollision(
  ballPos: Vector2D,
  ballRadius: number,
  segment: LineSegment
): CollisionResult {
  const { start, end } = segment

  // 선분 벡터
  const lineVec = subtract(end, start)
  const lineLength = magnitude(lineVec)

  if (lineLength === 0) {
    // 선분 길이가 0이면 점과의 거리만 체크
    const dist = magnitude(subtract(ballPos, start))
    return {
      collided: dist <= ballRadius,
      point: start,
      t: 0,
    }
  }

  // 정규화된 선분 방향
  const lineDir = multiply(lineVec, 1 / lineLength)

  // 공 중심에서 선분 시작점으로의 벡터
  const toBall = subtract(ballPos, start)

  // 선분 상의 가장 가까운 점의 위치 (t: 0~1)
  const t = Math.max(0, Math.min(1, dot(toBall, lineDir) / lineLength))

  // 선분 상의 가장 가까운 점
  const closestPoint = add(start, multiply(lineVec, t))

  // 공 중심과 가장 가까운 점 사이의 거리
  const distance = magnitude(subtract(ballPos, closestPoint))

  return {
    collided: distance <= ballRadius,
    point: closestPoint,
    t,
  }
}

/**
 * 공과 패들의 충돌 감지
 *
 * @param ballPos - 공 위치
 * @param ballRadius - 공 반지름
 * @param paddleCenter - 패들 중심
 * @param paddleDir - 패들 방향 (정규화된 탄젠트 벡터)
 * @param paddleLength - 패들 길이
 * @returns 충돌 여부
 */
export function checkBallPaddleCollision(
  ballPos: Vector2D,
  ballRadius: number,
  paddleCenter: Vector2D,
  paddleDir: Vector2D,
  paddleLength: number
): CollisionResult {
  const halfLength = paddleLength / 2

  const segment: LineSegment = {
    start: add(paddleCenter, multiply(paddleDir, -halfLength)),
    end: add(paddleCenter, multiply(paddleDir, halfLength)),
  }

  return checkBallLineCollision(ballPos, ballRadius, segment)
}

/**
 * 공이 Arena 밖으로 나갔는지 확인
 *
 * @param ballPos - 공 위치
 * @param arenaRadius - Arena 반지름
 * @returns 밖으로 나갔는지 여부
 */
export function isBallOutOfArena(
  ballPos: Vector2D,
  arenaRadius: number
): boolean {
  const distance = magnitude(ballPos)
  return distance > arenaRadius
}

/**
 * 공이 특정 Side를 통과했는지 확인
 *
 * Arena 중심에서 공까지의 방향이 해당 Side의 각도 범위 내에 있는지 확인
 *
 * @param ballPos - 공 위치
 * @param sideAngle - Side 중심 각도 (도)
 * @param anglePerSide - Side당 각도 (360 / N)
 * @returns Side 통과 여부
 */
export function isBallPassingSide(
  ballPos: Vector2D,
  sideAngle: number,
  anglePerSide: number
): boolean {
  // 공의 각도 계산 (라디안 -> 도)
  const ballAngle = (Math.atan2(ballPos.y, ballPos.x) * 180) / Math.PI

  // Side의 각도 범위
  const minAngle = sideAngle - anglePerSide / 2
  const maxAngle = sideAngle + anglePerSide / 2

  // 각도 정규화 (-180 ~ 180)
  const normalizeBallAngle = ((ballAngle + 180) % 360) - 180
  const normalizeMinAngle = ((minAngle + 180) % 360) - 180
  const normalizeMaxAngle = ((maxAngle + 180) % 360) - 180

  // 각도 범위 체크 (경계 처리 포함)
  if (normalizeMinAngle <= normalizeMaxAngle) {
    return (
      normalizeBallAngle >= normalizeMinAngle &&
      normalizeBallAngle <= normalizeMaxAngle
    )
  } else {
    // 0도를 걸치는 경우
    return (
      normalizeBallAngle >= normalizeMinAngle ||
      normalizeBallAngle <= normalizeMaxAngle
    )
  }
}
