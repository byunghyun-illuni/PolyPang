/**
 * 정N각형 기하 계산 유틸리티
 *
 * 출처: docs/planning/03_PRD_Arena상세.md
 */

import type { Vector2D } from '@/types'

/**
 * 각도를 라디안으로 변환
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * 라디안을 각도로 변환
 */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * 정N각형의 i번째 변의 중심 각도 계산
 *
 * 컨벤션:
 * - i=0: 12시 방향 (Top)
 * - 시계방향으로 증가
 *
 * @param i - Side 인덱스 (0-based)
 * @param n - 플레이어 수 (변의 개수)
 * @returns 각도 (도 단위)
 */
export function getSideAngle(i: number, n: number): number {
  return (360 / n) * i - 90
}

/**
 * 정N각형의 i번째 변의 중심 좌표 계산
 *
 * 중요: 이 함수는 변의 실제 중점(양 끝점의 중간)을 반환합니다.
 * 외접원 중심에서 변 방향으로의 거리가 아닙니다!
 *
 * @param i - Side 인덱스
 * @param n - 플레이어 수
 * @param radius - 외접원 반지름
 * @returns 변의 중심 좌표 (x, y)
 */
export function getSideCenter(i: number, n: number, radius: number): Vector2D {
  // 변의 양 끝점을 구해서 중점 계산
  const [v1, v2] = getSideVertices(i, n, radius)

  return {
    x: (v1.x + v2.x) / 2,
    y: (v1.y + v2.y) / 2,
  }
}

/**
 * 정N각형의 i번째 변의 양 끝점 좌표 계산
 *
 * @param i - Side 인덱스
 * @param n - 플레이어 수
 * @param radius - 반지름
 * @returns [시작점, 끝점]
 */
export function getSideVertices(
  i: number,
  n: number,
  radius: number
): [Vector2D, Vector2D] {
  const anglePerSide = 360 / n
  const halfAngle = anglePerSide / 2

  // Side의 중심 각도
  const centerAngle = getSideAngle(i, n)

  // 양 끝점 각도
  const startAngle = degToRad(centerAngle - halfAngle)
  const endAngle = degToRad(centerAngle + halfAngle)

  return [
    {
      x: radius * Math.cos(startAngle),
      y: radius * Math.sin(startAngle),
    },
    {
      x: radius * Math.cos(endAngle),
      y: radius * Math.sin(endAngle),
    },
  ]
}

/**
 * Side의 길이 계산
 *
 * 공식: L = 2 * R * sin(π / N)
 *
 * @param n - 플레이어 수
 * @param radius - 반지름
 * @returns Side 길이
 */
export function getSideLength(n: number, radius: number): number {
  return 2 * radius * Math.sin(Math.PI / n)
}

/**
 * Side의 법선 벡터 계산 (바깥쪽 방향)
 *
 * @param i - Side 인덱스
 * @param n - 플레이어 수
 * @returns 정규화된 법선 벡터
 */
export function getSideNormal(i: number, n: number): Vector2D {
  const angle = getSideAngle(i, n)
  const rad = degToRad(angle)

  return {
    x: Math.cos(rad),
    y: Math.sin(rad),
  }
}

/**
 * Side의 탄젠트 벡터 계산 (Side를 따라가는 방향)
 *
 * 공식: t_i = (-sin(θ_i), cos(θ_i))
 *
 * @param i - Side 인덱스
 * @param n - 플레이어 수
 * @returns 정규화된 탄젠트 벡터
 */
export function getSideTangent(i: number, n: number): Vector2D {
  const angle = getSideAngle(i, n)
  const rad = degToRad(angle)

  return {
    x: -Math.sin(rad),
    y: Math.cos(rad),
  }
}

/**
 * 내 Side를 하단에 고정하기 위한 Arena 회전 각도 계산
 *
 * 핵심 UX: 모든 플레이어는 자신의 Side가 화면 하단(6시 방향)에 위치
 *
 * @param myIndex - 내 플레이어 인덱스
 * @param n - 플레이어 수
 * @returns 회전 각도 (도 단위)
 */
export function getArenaRotationForMyPlayer(
  myIndex: number,
  n: number
): number {
  const myAngle = getSideAngle(myIndex, n)
  // 반대 방향으로 회전하여 내 Side가 하단(90도)에 오도록
  return -myAngle - 90
}

/**
 * 벡터 회전
 *
 * @param point - 원본 좌표
 * @param angleDeg - 회전 각도 (도 단위)
 * @returns 회전된 좌표
 */
export function rotatePoint(point: Vector2D, angleDeg: number): Vector2D {
  const rad = degToRad(angleDeg)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }
}

/**
 * 정N각형의 모든 정점 계산
 *
 * @param n - 플레이어 수
 * @param radius - 반지름
 * @returns 정점 배열 (시계방향)
 */
export function getAllVertices(n: number, radius: number): Vector2D[] {
  const vertices: Vector2D[] = []

  for (let i = 0; i < n; i++) {
    const anglePerSide = 360 / n
    const angle = degToRad((360 / n) * i - 90 - anglePerSide / 2)

    vertices.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    })
  }

  return vertices
}
