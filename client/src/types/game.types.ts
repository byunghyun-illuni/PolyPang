import type { RoomState, RoomCode, PlayerId, Timestamp } from './index';
import type { Arena } from './arena.types';
import type { Ball } from './ball.types';
import type { Paddle, PaddleConfig } from './paddle.types';
import type { PlayerRanking } from './player.types';

/**
 * 게임 상태
 */
export interface GameState {
  /** 게임 ID */
  gameId: string;

  /** 방 코드 */
  roomCode: RoomCode;

  /** 게임 상태 */
  state: RoomState;

  /** 경기장 */
  arena: Arena;

  /** 공 */
  ball: Ball;

  /** 패들 맵 (playerId → Paddle) */
  paddles: Record<PlayerId, Paddle>;

  /** 생존 플레이어 ID 목록 */
  alivePlayers: PlayerId[];

  /** 탈락 플레이어 ID 목록 (탈락 순서대로) */
  outPlayers: PlayerId[];

  /** 현재 틱 번호 (서버 시뮬레이션용) */
  tick: number;

  /** 게임 시작 시간 */
  startedAt: Timestamp;

  /** 게임 종료 시간 */
  finishedAt?: Timestamp;

  /** 우승자 ID */
  winnerId?: PlayerId;

  /** 랭킹 정보 */
  ranking?: PlayerRanking[];
}

/**
 * 부분 게임 상태 업데이트 (델타)
 */
export interface GameStateUpdate {
  ball?: Partial<Ball>;
  paddles?: Record<PlayerId, Partial<Paddle>>;
  arena?: Partial<Arena>;
  alivePlayers?: PlayerId[];
  outPlayers?: PlayerId[];
  tick?: number;
}

/**
 * 게임 설정
 */
export interface GameConfig {
  /** 경기장 반지름 (화면 크기 기준 비율) */
  arenaRadiusRatio: number; // 0.35 ~ 0.42

  /** 공 설정 */
  ball: {
    /** 반지름 (Arena 크기 기준) */
    radiusRatio: number; // 0.025 ~ 0.035
    /** 초기 속도 */
    baseSpeed: number;
    /** 속도 증가율 (히트당) */
    speedIncreaseRate: number; // 1.05 = 5%
  };

  /** 패들 설정 */
  paddle: PaddleConfig;

  /** 물리 설정 */
  physics: {
    /** 서버 틱 레이트 (초당) */
    tickRate: number; // 30
    /** 클라이언트 브로드캐스트 레이트 */
    broadcastRate: number; // 30
  };

  /** 연출 설정 */
  effects: {
    /** OUT 슬로우모션 지속 시간 (초) */
    outSlowDuration: number; // 0.5
    /** 리메시 애니메이션 지속 시간 (초) */
    remeshDuration: number; // 0.5
  };

  /** 공정성 보정 설정 */
  fairness: {
    /** 공정성 보정 활성화 여부 */
    enabled: boolean;
    /** 히트 히스토리 추적 시간 (초) */
    historyWindow: number; // 8
    /** 최대 각도 편향 (도) */
    maxAngleBias: number; // 3
  };
}
