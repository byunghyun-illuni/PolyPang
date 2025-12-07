import type { PlayerId, Color, PaddleDirection } from './index';

/**
 * 패들
 */
export interface Paddle {
  /** 플레이어 ID */
  playerId: PlayerId;

  /** Side 인덱스 */
  sideIndex: number;

  /** 패들 중심 위치 (-1 ~ 1, Side 기준 상대 위치) */
  position: number;

  /** 패들 속도 */
  velocity: number;

  /** 패들 길이 (픽셀) */
  length: number;

  /** 패들 두께 (픽셀) */
  thickness: number;

  /** 최대 이동 속도 */
  maxSpeed: number;

  /** 이동 가능 범위 (Side 길이 기준 비율) */
  moveRange: number; // 예: 0.6 = Side 길이의 60%

  /** 현재 입력 방향 */
  direction: PaddleDirection;

  /** 패들 색상 */
  color: Color;
}

/**
 * 패들 설정 (튜닝값)
 */
export interface PaddleConfig {
  /** 패들 길이 계수 (Side 길이 기준) */
  lengthRatio: number; // α = 0.4

  /** 이동 범위 계수 (Side 길이 기준) */
  moveRangeRatio: number; // β = 0.6

  /** 패들 두께 (고정값) */
  thickness: number;

  /** 최대 이동 속도 */
  maxSpeed: number;

  /** 가속도 */
  acceleration: number;

  /** 감속도 (마찰) */
  friction: number;
}
