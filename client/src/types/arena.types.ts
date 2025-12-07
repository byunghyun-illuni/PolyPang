import type { Vector2D, Color, PlayerId } from './index';

/**
 * 경기장
 */
export interface Arena {
  /** 현재 플레이어 수 (정N각형의 N) */
  n: number;

  /** 경기장 반지름 */
  radius: number;

  /** 정N각형 꼭짓점 좌표 */
  vertices: Vector2D[];

  /** Side 정보 (각 변) */
  sides: Side[];
}

/**
 * Side (경기장의 한 변)
 */
export interface Side {
  /** Side 인덱스 (0-based) */
  index: number;

  /** 시작점 좌표 */
  start: Vector2D;

  /** 끝점 좌표 */
  end: Vector2D;

  /** 중심점 좌표 */
  center: Vector2D;

  /** 법선 벡터 (외부 방향) */
  normal: Vector2D;

  /** 탄젠트 벡터 (패들 이동 방향) */
  tangent: Vector2D;

  /** 변의 길이 */
  length: number;

  /** 할당된 플레이어 ID */
  playerId: PlayerId;

  /** 플레이어 색상 */
  color: Color;

  /** Side 상태 (Alive/Out) */
  isActive: boolean;
}
