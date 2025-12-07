/**
 * PolyPang 게임 엔티티 타입 정의
 * 출처: docs/planning/05_도메인모델.md, 08_API명세서.md
 */

import { Vector2D, Velocity, Color, PlayerId, RoomCode, Timestamp } from './primitives';
import { RoomState, PlayerState, PaddleDirection } from './enums';

/**
 * Player (플레이어)
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

  /** 연결 끊김 시간 (재연결 타임아웃 용) */
  disconnectedAt?: Timestamp;
}

/**
 * Arena (경기장)
 */
export interface Arena {
  /** 플레이어 수 (N) */
  n: number;

  /** 반지름 */
  radius: number;

  /** 정N각형 꼭짓점 좌표 */
  vertices: Vector2D[];

  /** 각 Side 정보 */
  sides: Side[];

  /** 회전 각도 (라디안) */
  rotation: number;
}

/**
 * Side (변)
 */
export interface Side {
  /** Side 인덱스 (0-based) */
  index: number;

  /** 시작점 */
  start: Vector2D;

  /** 끝점 */
  end: Vector2D;

  /** 중심점 */
  center: Vector2D;

  /** 법선 벡터 (outward) */
  normal: Vector2D;

  /** 탄젠트 벡터 (패들 이동 방향) */
  tangent: Vector2D;

  /** 소유 플레이어 ID */
  playerId?: PlayerId;

  /** Side 길이 */
  length: number;
}

/**
 * Ball (공)
 */
export interface Ball {
  /** 위치 */
  position: Vector2D;

  /** 속도 벡터 */
  velocity: Velocity;

  /** 속도 크기 (스칼라) */
  speed: number;

  /** 공 반지름 */
  radius: number;

  /** 마지막으로 히트한 플레이어 ID */
  lastHitBy?: PlayerId;

  /** 총 히트 횟수 */
  hitCount: number;
}

/**
 * Paddle (패들)
 */
export interface Paddle {
  /** 소유 플레이어 ID */
  playerId: PlayerId;

  /** Side 인덱스 */
  sideIndex: number;

  /** 위치 (Side 중심 기준 상대 좌표, -1 ~ 1) */
  position: number;

  /** 속도 */
  velocity: number;

  /** 현재 입력 방향 */
  direction: PaddleDirection;

  /** 패들 길이 */
  length: number;

  /** 이동 범위 (Side 길이 대비 비율) */
  moveRange: number;
}

/**
 * Room (방)
 */
export interface Room {
  /** 방 코드 (6자리) */
  roomCode: RoomCode;

  /** 방 상태 */
  state: RoomState;

  /** 플레이어 목록 */
  players: Map<PlayerId, Player>;

  /** 최대 인원 */
  maxPlayers: number;

  /** Host 플레이어 ID */
  hostId: PlayerId;

  /** 생성 시간 */
  createdAt: Timestamp;

  /** 게임 상태 (INGAME 시) */
  gameState?: GameState;
}

/**
 * 플레이어 통계
 */
export interface PlayerStats {
  /** 히트 횟수 */
  hitCount: number;

  /** 생존 시간 (초) */
  survivalTime: number;

  /** OUT 시간 */
  outAt?: Timestamp;

  /** 랭킹 (게임 종료 시 계산) */
  rank?: number;
}

/**
 * GameState (게임 상태)
 */
export interface GameState {
  /** 게임 ID */
  gameId: string;

  /** 방 코드 */
  roomCode: RoomCode;

  /** Arena */
  arena: Arena;

  /** Ball */
  ball: Ball;

  /** Paddles */
  paddles: Map<PlayerId, Paddle>;

  /** 생존 플레이어 ID 목록 */
  alivePlayers: PlayerId[];

  /** OUT 플레이어 ID 목록 (순서대로) */
  outPlayers: PlayerId[];

  /** 플레이어별 통계 */
  playerStats: Map<PlayerId, PlayerStats>;

  /** 현재 틱 */
  tick: number;

  /** 게임 시작 시간 */
  startedAt: Timestamp;

  /** 마지막 OUT 시간 (슬로우모션용) */
  lastOutAt?: Timestamp;
}

/**
 * GameResult (게임 결과)
 */
export interface GameResult {
  /** 우승자 */
  winner: Player;

  /** 랭킹 */
  ranking: PlayerRanking[];

  /** 게임 통계 */
  stats: GameStats;
}

/**
 * PlayerRanking (플레이어 랭킹)
 */
export interface PlayerRanking {
  player: Player;
  rank: number;           // 1~N
  survivalTime: number;   // 생존 시간 (초)
  outReason?: string;     // 탈락 사유
}

/**
 * GameStats (게임 통계)
 */
export interface GameStats {
  totalDuration: number;    // 총 게임 시간 (초)
  totalHits: number;        // 총 히트 수
  finalBallSpeed: number;   // 최종 공 속도
  playerStats: Record<PlayerId, {
    hitCount: number;
    survivalTime: number;
  }>;
}
