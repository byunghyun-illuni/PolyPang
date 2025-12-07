/**
 * PolyPang Arena 관리자
 * 출처: docs/planning/01_PRD_게임기획.md (섹션 3), 03_PRD_Arena상세.md
 *
 * 역할:
 * 1. 정N각형 Arena 생성
 * 2. OUT 시 Arena 리메시 (정N → 정(N-1)각형)
 * 3. Side/Paddle 재배치
 */

import { Arena, GameState } from '../../types/game.types';
import { createArena, calculateSideLength } from '../../utils/geometry';
import { GAME_CONSTANTS } from '../../utils/constants';
import { PhysicsEngine } from './PhysicsEngine';

export class ArenaManager {
  private physicsEngine: PhysicsEngine;

  constructor(physicsEngine: PhysicsEngine) {
    this.physicsEngine = physicsEngine;
  }

  /**
   * 초기 Arena 생성 (게임 시작 시)
   *
   * @param playerIds - 플레이어 ID 목록 (순서대로 Side 할당)
   * @param radius - 반지름
   * @returns Arena
   */
  createInitialArena(
    playerIds: string[],
    radius: number = GAME_CONSTANTS.ARENA_BASE_RADIUS
  ): Arena {
    const n = playerIds.length;
    return createArena(n, radius, playerIds);
  }

  /**
   * Arena 리메시 (OUT 발생 시)
   *
   * - 정N각형 → 정(N-1)각형
   * - 남은 플레이어들을 새 Side에 재배치
   * - Paddle 재초기화
   *
   * @param gameState - 게임 상태
   * @param outPlayerId - OUT 당한 플레이어 ID
   */
  remeshArena(gameState: GameState, outPlayerId: string): void {
    // 1. OUT 플레이어 제거
    gameState.alivePlayers = gameState.alivePlayers.filter((id) => id !== outPlayerId);
    gameState.outPlayers.push(outPlayerId);

    // 2. 남은 플레이어 수
    const n = gameState.alivePlayers.length;

    if (n === 0) {
      // 모든 플레이어 OUT (무승부 또는 마지막 동시 OUT)
      return;
    }

    // 3. 새 Arena 생성
    const newArena = createArena(
      n,
      gameState.arena.radius,
      gameState.alivePlayers
    );

    gameState.arena = newArena;

    // 4. 패들 재초기화
    const newPaddles = new Map();
    const sideLength = calculateSideLength(gameState.arena.radius, n);

    for (let i = 0; i < gameState.alivePlayers.length; i++) {
      const playerId = gameState.alivePlayers[i];
      const paddle = this.physicsEngine.initPaddle(playerId, i, sideLength);
      newPaddles.set(playerId, paddle);
    }

    gameState.paddles = newPaddles;
  }

  /**
   * 게임 종료 조건 체크
   *
   * @param gameState - 게임 상태
   * @returns true if 게임 종료 (Alive 1명 이하)
   */
  isGameOver(gameState: GameState): boolean {
    return gameState.alivePlayers.length <= 1;
  }

  /**
   * 우승자 ID 가져오기
   *
   * @param gameState - 게임 상태
   * @returns 우승자 ID (없으면 undefined)
   */
  getWinnerId(gameState: GameState): string | undefined {
    if (gameState.alivePlayers.length === 1) {
      return gameState.alivePlayers[0];
    }
    return undefined;
  }
}
