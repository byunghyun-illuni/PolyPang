/**
 * PolyPang 기하학 계산 (정N각형)
 * 출처: docs/planning/01_PRD_게임기획.md, 03_PRD_Arena상세.md
 *
 * 핵심 공식:
 * - θ_i = (360° / N) × i - 90° (12시 방향부터 시계방향)
 * - center_i = (R × cos(θ_i), R × sin(θ_i))
 * - L = 2 * R * sin(π / N)
 */

import { Vector2D, LineSegment } from '../types';
import { Arena, Side } from '../types/game.types';
import { GAME_CONSTANTS } from './constants';

/**
 * 정N각형 Arena 생성
 *
 * @param n - 플레이어 수 (변의 개수)
 * @param radius - 반지름
 * @param playerIds - 플레이어 ID 목록 (순서대로 Side 할당)
 * @returns Arena 객체
 */
export function createArena(
  n: number,
  radius: number = GAME_CONSTANTS.ARENA_BASE_RADIUS,
  playerIds: string[] = []
): Arena {
  const rotation = -Math.PI / 2; // 12시 방향을 0번 Side로
  const vertices = calculateVertices(n, radius, rotation);
  const sides = calculateSides(vertices, n, playerIds);

  return {
    n,
    radius,
    vertices,
    sides,
    rotation,
  };
}

/**
 * 정N각형 꼭짓점 계산
 *
 * 클라이언트(client/src/physics/geometry.ts의 getAllVertices)와 일치해야 함!
 * - Side i의 중심 각도 = (360/n) * i - 90°
 * - 정점은 Side 중심에서 ±(180/n)° 위치
 *
 * @param n - 변의 개수
 * @param radius - 반지름
 * @param rotation - 회전 각도 (라디안)
 * @returns 꼭짓점 배열
 */
export function calculateVertices(
  n: number,
  radius: number,
  rotation: number = -Math.PI / 2
): Vector2D[] {
  const vertices: Vector2D[] = [];
  const halfAngle = Math.PI / n; // 클라이언트와 일치: -180/n 만큼 오프셋

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n + rotation - halfAngle;
    vertices.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  return vertices;
}

/**
 * Side 정보 계산
 *
 * @param vertices - 꼭짓점 배열
 * @param n - 변의 개수
 * @param playerIds - 플레이어 ID 목록
 * @returns Side 배열
 */
export function calculateSides(
  vertices: Vector2D[],
  n: number,
  playerIds: string[]
): Side[] {
  const sides: Side[] = [];

  for (let i = 0; i < n; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % n];
    const center = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };

    // 법선 벡터 (외향, outward)
    const edgeVector = { x: end.x - start.x, y: end.y - start.y };
    const edgeLength = Math.sqrt(edgeVector.x ** 2 + edgeVector.y ** 2);

    // 법선 벡터: 시계방향 90도 회전 → (dx, dy) => (dy, -dx) → 외향 법선
    // 꼭짓점이 반시계방향으로 나열되면 오른쪽(시계방향 회전)이 외향
    const normal = {
      x: edgeVector.y / edgeLength,
      y: -edgeVector.x / edgeLength,
    };

    // 탄젠트 벡터 (패들 이동 방향)
    const tangent = {
      x: edgeVector.x / edgeLength,
      y: edgeVector.y / edgeLength,
    };

    sides.push({
      index: i,
      start,
      end,
      center,
      normal,
      tangent,
      playerId: playerIds[i] || undefined,
      length: edgeLength,
    });
  }

  return sides;
}

/**
 * Side 길이 계산
 *
 * @param radius - 반지름
 * @param n - 변의 개수
 * @returns Side 길이
 */
export function calculateSideLength(radius: number, n: number): number {
  return 2 * radius * Math.sin(Math.PI / n);
}

/**
 * 벡터 정규화
 *
 * @param v - 벡터
 * @returns 정규화된 벡터 (크기 1)
 */
export function normalize(v: Vector2D): Vector2D {
  const length = Math.sqrt(v.x ** 2 + v.y ** 2);
  if (length === 0) return { x: 0, y: 0 };
  return { x: v.x / length, y: v.y / length };
}

/**
 * 벡터 내적
 *
 * @param a - 벡터 a
 * @param b - 벡터 b
 * @returns 내적 값
 */
export function dot(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * 벡터 크기 계산
 *
 * @param v - 벡터
 * @returns 크기
 */
export function magnitude(v: Vector2D): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2);
}

/**
 * 점과 선분 사이 최단 거리 계산
 *
 * @param point - 점
 * @param segment - 선분
 * @returns 최단 거리
 */
export function distanceToSegment(point: Vector2D, segment: LineSegment): number {
  const { start, end } = segment;
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    // 선분이 점인 경우
    return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2);
  }

  // t는 선분 상의 투영 지점 파라미터 (0~1)
  let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  // 투영 지점
  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };

  // 점과 투영 지점 사이 거리
  return Math.sqrt((point.x - projection.x) ** 2 + (point.y - projection.y) ** 2);
}

/**
 * 점이 선분 위에 있는지 확인
 *
 * @param point - 점
 * @param segment - 선분
 * @param tolerance - 허용 오차
 * @returns true if 점이 선분 위에 있음
 */
export function isPointOnSegment(
  point: Vector2D,
  segment: LineSegment,
  tolerance: number = 1e-6
): boolean {
  return distanceToSegment(point, segment) < tolerance;
}

/**
 * 반사 벡터 계산 (공 반사)
 *
 * 공식: v_reflected = v - 2 * (v · n) * n
 *
 * @param velocity - 입사 속도 벡터
 * @param normal - 법선 벡터 (정규화됨)
 * @returns 반사 후 속도 벡터
 */
export function reflect(velocity: Vector2D, normal: Vector2D): Vector2D {
  const dotProduct = dot(velocity, normal);
  return {
    x: velocity.x - 2 * dotProduct * normal.x,
    y: velocity.y - 2 * dotProduct * normal.y,
  };
}
