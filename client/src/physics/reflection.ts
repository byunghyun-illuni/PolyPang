/**
 * 반사 계산 유틸리티
 *
 * 역할:
 * - 법선 벡터 기준 반사 계산
 * - 속도 벡터 반사
 *
 * 공식: 반사 후 속도 = 속도 - 2*(속도·법선)*법선
 *
 * 출처: docs/planning/01_PRD_게임기획.md
 */

import type { Vector2D } from '@/types'
import { dot, multiply, subtract, magnitude, normalize } from './vector'

/**
 * 벡터를 법선 기준으로 반사
 *
 * @param velocity - 입사 속도 벡터
 * @param normal - 법선 벡터 (정규화 필요)
 * @returns 반사 후 속도 벡터
 */
export function reflect(velocity: Vector2D, normal: Vector2D): Vector2D {
  // 법선이 정규화되어 있다고 가정
  // 반사 공식: v' = v - 2(v·n)n

  const dotProduct = dot(velocity, normal)
  const reflection = multiply(normal, 2 * dotProduct)

  return subtract(velocity, reflection)
}

/**
 * 속도 크기를 조정한 반사 벡터 반환
 *
 * 패들과의 충돌 시 사용 (속도 5% 증가)
 *
 * @param velocity - 입사 속도 벡터
 * @param normal - 법선 벡터
 * @param speedMultiplier - 속도 배율 (기본 1.05 = 5% 증가)
 * @returns 반사 후 속도 벡터 (속도 조정됨)
 */
export function reflectWithSpeedBoost(
  velocity: Vector2D,
  normal: Vector2D,
  speedMultiplier: number = 1.05
): Vector2D {
  // 기본 반사
  const reflected = reflect(velocity, normal)

  // 속도 크기 계산
  const speed = magnitude(reflected)

  // 속도 증가
  const newSpeed = speed * speedMultiplier

  // 방향은 유지하고 속도만 증가
  const direction = normalize(reflected)

  return multiply(direction, newSpeed)
}

/**
 * 패들 위치에 따른 반사각 미세 조정 (옵션)
 *
 * 패들의 좌/우 위치에 따라 반사각을 약간 조정
 *
 * @param velocity - 입사 속도 벡터
 * @param normal - 법선 벡터
 * @param paddleOffset - 패들 중심에서의 상대 위치 (-1 ~ 1)
 * @param maxAngleAdjust - 최대 각도 조정 (라디안, 기본 0.1 = ~5.7도)
 * @returns 조정된 반사 속도 벡터
 */
export function reflectWithPaddleAngle(
  velocity: Vector2D,
  normal: Vector2D,
  paddleOffset: number,
  maxAngleAdjust: number = 0.1
): Vector2D {
  // 기본 반사
  const reflected = reflect(velocity, normal)

  // 패들 오프셋에 따른 각도 조정 (-maxAngleAdjust ~ +maxAngleAdjust)
  const angleAdjust = paddleOffset * maxAngleAdjust

  // 회전 행렬 적용
  const cos = Math.cos(angleAdjust)
  const sin = Math.sin(angleAdjust)

  return {
    x: reflected.x * cos - reflected.y * sin,
    y: reflected.x * sin + reflected.y * cos,
  }
}
