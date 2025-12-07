/**
 * 벡터 연산 유틸리티
 */

import type { Vector2D } from '@/types'

/**
 * 벡터 덧셈
 */
export function add(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y }
}

/**
 * 벡터 뺄셈
 */
export function subtract(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y }
}

/**
 * 벡터 스칼라 곱
 */
export function multiply(v: Vector2D, scalar: number): Vector2D {
  return { x: v.x * scalar, y: v.y * scalar }
}

/**
 * 벡터 내적
 */
export function dot(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y
}

/**
 * 벡터 크기
 */
export function magnitude(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

/**
 * 벡터 정규화
 */
export function normalize(v: Vector2D): Vector2D {
  const mag = magnitude(v)
  if (mag === 0) return { x: 0, y: 0 }
  return { x: v.x / mag, y: v.y / mag }
}

/**
 * 벡터 거리
 */
export function distance(a: Vector2D, b: Vector2D): number {
  return magnitude(subtract(a, b))
}

/**
 * 벡터 각도 (라디안)
 */
export function angle(v: Vector2D): number {
  return Math.atan2(v.y, v.x)
}
