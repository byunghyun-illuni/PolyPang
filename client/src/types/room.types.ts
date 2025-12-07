import type { RoomState, RoomCode, PlayerId, Timestamp } from './index';
import type { Player } from './player.types';
import type { GameState } from './game.types';

/**
 * 방
 */
export interface Room {
  /** 방 코드 (6자리) */
  roomCode: RoomCode;

  /** 방 상태 */
  state: RoomState;

  /** 방장 ID */
  hostId: PlayerId;

  /** 참가 플레이어 목록 */
  players: Player[];

  /** 최대 인원 (2~8) */
  maxPlayers: number;

  /** 게임 상태 (INGAME/RESULT 시에만 존재) */
  gameState?: GameState;

  /** 방 생성 시간 */
  createdAt: Timestamp;

  /** 게임 시작 시간 */
  startedAt?: Timestamp;

  /** 게임 종료 시간 */
  finishedAt?: Timestamp;
}

/**
 * 방 생성 DTO
 */
export interface CreateRoomDto {
  nickname: string;
  maxPlayers?: number; // 기본값: 8
}

/**
 * 방 참가 DTO
 */
export interface JoinRoomDto {
  roomCode: RoomCode;
  nickname: string;
}
