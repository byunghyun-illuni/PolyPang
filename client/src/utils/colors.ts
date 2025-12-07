/**
 * PolyPang 색상 팔레트
 *
 * 출처: docs/planning/03_PRD_Arena상세.md
 */

import type { Color } from '@/types'

/**
 * 플레이어 색상 (최대 8명)
 */
export const PLAYER_COLORS: readonly Color[] = [
  '#EF4444', // P1 빨강
  '#F97316', // P2 주황
  '#EAB308', // P3 노랑
  '#22C55E', // P4 초록
  '#06B6D4', // P5 청록
  '#3B82F6', // P6 파랑
  '#8B5CF6', // P7 보라
  '#EC4899', // P8 분홍
] as const

/**
 * 내 패들 강조색 (노란색)
 */
export const MY_PADDLE_COLOR: Color = '#FCD34D'

/**
 * OUT 플레이어 색상 (회색)
 */
export const OUT_PLAYER_COLOR: Color = '#9CA3AF'

/**
 * 플레이어 인덱스로 색상 가져오기
 */
export function getPlayerColor(index: number): Color {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
}

/**
 * PlayerId로 색상 가져오기 (플레이어 목록에서 인덱스 찾기)
 */
export function getPlayerColorById(
  playerId: string,
  players: Array<{ userId: string }>
): Color {
  const index = players.findIndex((p) => p.userId === playerId)
  return index >= 0 ? getPlayerColor(index) : OUT_PLAYER_COLOR
}
