import type { PlayerState, Color, PlayerId, Timestamp } from './index';

/**
 * 플레이어
 */
export interface Player {
  /** 플레이어 고유 ID (UUID) */
  userId: PlayerId;

  /** 닉네임 (1~10자) */
  nickname: string;

  /** 현재 플레이어 상태 */
  state: PlayerState;

  /** Side 인덱스 (0-based, INGAME 시에만 할당) */
  sideIndex?: number;

  /** 플레이어 고유 색상 (Hex) */
  color: Color;

  /** Ready 상태 (LOBBY에서만 사용) */
  isReady: boolean;

  /** 호스트 여부 */
  isHost: boolean;

  /** 접속 시간 */
  joinedAt: Timestamp;

  /** 마지막 활동 시간 (핑퐁용) */
  lastActiveAt: Timestamp;
}

/**
 * 플레이어 생성 DTO
 */
export interface CreatePlayerDto {
  nickname: string;
  color?: Color; // 미지정 시 서버에서 자동 할당
}

/**
 * 플레이어 랭킹 정보
 */
export interface PlayerRanking {
  player: Player;
  rank: number; // 1~N
  survivalTime: number; // 생존 시간 (초)
  outReason?: string; // 탈락 사유
}
