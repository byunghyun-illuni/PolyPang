/**
 * PolyPang 게임 엔진
 * 출처: docs/planning/01_PRD_게임기획.md, 04_기술스택.md
 *
 * 역할:
 * 1. 30fps 틱 루프
 * 2. 물리 시뮬레이션
 * 3. 충돌 감지 및 처리
 * 4. OUT 판정 및 Arena 리메시
 * 5. 게임 종료 조건 체크
 * 6. Socket 이벤트 브로드캐스트
 */

import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, PlayerStats } from '../../types/game.types';
import { PhysicsEngine } from '../managers/PhysicsEngine';
import { ArenaManager } from '../managers/ArenaManager';
import { CollisionType } from '../../types/enums';
import { GAME_CONSTANTS } from '../../utils/constants';
import { calculateSideLength } from '../../utils/geometry';

export class PolyPangEngine {
  private io: SocketIOServer;
  private roomCode: string;
  private gameState: GameState | null = null;
  private tickInterval: NodeJS.Timeout | null = null;

  private physicsEngine: PhysicsEngine;
  private arenaManager: ArenaManager;

  constructor(io: SocketIOServer, roomCode: string) {
    this.io = io;
    this.roomCode = roomCode;
    this.physicsEngine = new PhysicsEngine();
    this.arenaManager = new ArenaManager(this.physicsEngine);
  }

  /**
   * 게임 초기화 및 시작
   *
   * - 항상 8각형으로 시작
   * - 실제 플레이어 + 봇(가만히 있는 패들)로 8명 채움
   * - 봇도 OUT 가능 (쉬운 타겟)
   *
   * @param players - 플레이어 목록
   */
  start(players: Map<string, Player>): void {
    // 1. 실제 플레이어 목록
    const realPlayerIds = Array.from(players.keys());
    const realPlayerCount = realPlayerIds.length;

    // 2. 항상 8각형 (빈 자리는 봇으로 채움)
    const n = GAME_CONSTANTS.FIXED_ARENA_SIDES; // 8
    const botCount = n - realPlayerCount;

    // 3. 플레이어 배치: 실제 플레이어를 균등하게 배치하고 사이에 봇 배치
    const allPlayerIds = this.distributePlayersAndBots(realPlayerIds, n);

    const arena = this.arenaManager.createInitialArena(allPlayerIds);
    const ball = this.physicsEngine.initBall(arena.radius, n);

    const paddles = new Map();
    const playerStats = new Map<string, PlayerStats>();
    const sideLength = calculateSideLength(arena.radius, n);

    for (let i = 0; i < n; i++) {
      const playerId = allPlayerIds[i];
      const paddle = this.physicsEngine.initPaddle(playerId, i, sideLength, n);
      paddles.set(playerId, paddle);

      // 플레이어 통계 초기화
      playerStats.set(playerId, {
        hitCount: 0,
        survivalTime: 0,
      });
    }

    this.gameState = {
      gameId: uuidv4(),
      roomCode: this.roomCode,
      arena,
      ball,
      paddles,
      alivePlayers: allPlayerIds,
      outPlayers: [],
      playerStats,
      tick: 0,
      startedAt: new Date().toISOString(),
    };

    console.log(`[PolyPang] 게임 시작: ${realPlayerCount}명 플레이어 + ${botCount}명 봇 = 8각형`);

    // 2. game_started 이벤트 전송
    this.io.to(this.roomCode).emit('game_started', {
      gameState: this.serializeGameState(this.gameState),
    });

    // 3. 30fps 틱 루프 시작
    this.startTickLoop();
  }

  /**
   * 실제 플레이어와 봇을 균등하게 배치
   *
   * 예: 2명 플레이어 → [P1, BOT, BOT, BOT, P2, BOT, BOT, BOT]
   *     3명 플레이어 → [P1, BOT, BOT, P2, BOT, P3, BOT, BOT] (대략 균등)
   *
   * @param realPlayerIds - 실제 플레이어 ID 목록
   * @param totalSlots - 전체 슬롯 수 (8)
   * @returns 배치된 플레이어/봇 ID 목록
   */
  private distributePlayersAndBots(realPlayerIds: string[], totalSlots: number): string[] {
    const result: string[] = new Array(totalSlots).fill(null);
    const realCount = realPlayerIds.length;

    if (realCount === 0) {
      // 모두 봇 (테스트용)
      for (let i = 0; i < totalSlots; i++) {
        result[i] = `${GAME_CONSTANTS.BOT_ID_PREFIX}${i}`;
      }
      return result;
    }

    // 실제 플레이어를 균등하게 배치
    const spacing = totalSlots / realCount;
    for (let i = 0; i < realCount; i++) {
      const slotIndex = Math.floor(i * spacing);
      result[slotIndex] = realPlayerIds[i];
    }

    // 나머지 빈 슬롯에 봇 배치
    let botIndex = 0;
    for (let i = 0; i < totalSlots; i++) {
      if (result[i] === null) {
        result[i] = `${GAME_CONSTANTS.BOT_ID_PREFIX}${botIndex}`;
        botIndex++;
      }
    }

    return result;
  }

  /**
   * 30fps 틱 루프 시작
   */
  private startTickLoop(): void {
    const tickInterval = 1000 / GAME_CONSTANTS.SERVER_TICK_RATE; // 33ms

    this.tickInterval = setInterval(() => {
      if (!this.gameState) {
        this.stop();
        return;
      }

      this.tick();
    }, tickInterval);
  }

  /**
   * 1 틱 실행
   */
  private tick(): void {
    if (!this.gameState) return;

    this.gameState.tick++;

    // 1. 물리 시뮬레이션
    const collision = this.physicsEngine.tick(this.gameState);

    // 2. 충돌 처리
    this.handleCollision(collision);

    // 3. 게임 상태 브로드캐스트 (Delta)
    this.broadcastGameState();
  }

  /**
   * 충돌 처리
   */
  private handleCollision(collision: any): void {
    if (!this.gameState) return;

    switch (collision.type) {
      case CollisionType.PADDLE_HIT:
        // HIT Pang 이벤트 전송
        this.io.to(this.roomCode).emit('hit_pang', collision);

        // 플레이어 히트 카운트 증가
        const stats = this.gameState.playerStats.get(collision.playerId);
        if (stats) {
          stats.hitCount++;
        }
        break;

      case CollisionType.WALL_REFLECT:
        // 벽 반사 (이벤트 없음)
        break;

      case CollisionType.SIDE_OUT:
        // OUT 판정
        this.handlePlayerOut(collision.playerId, collision.sideIndex);
        break;

      case CollisionType.NONE:
        // 충돌 없음
        break;
    }
  }

  /**
   * 플레이어 OUT 처리
   */
  private async handlePlayerOut(playerId: string, sideIndex: number): Promise<void> {
    if (!this.gameState) return;

    // 통계 업데이트: OUT 시간 및 생존 시간 기록
    const stats = this.gameState.playerStats.get(playerId);
    if (stats) {
      const outTime = new Date();
      const startTime = new Date(this.gameState.startedAt);
      stats.outAt = outTime.toISOString();
      stats.survivalTime = (outTime.getTime() - startTime.getTime()) / 1000; // 초 단위
    }

    // 1. OUT Pang 이벤트
    this.io.to(this.roomCode).emit('out_pang', {
      userId: playerId,
      sideIndex,
    });

    // 2. player_out 이벤트
    this.io.to(this.roomCode).emit('player_out', {
      userId: playerId,
      reason: 'MISS',
    });

    // 3. 게임 루프 일시 중지 (슬로우모션)
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // 4. 0.5초 대기 (슬로우모션 + OUT Pang 연출)
    await new Promise((resolve) =>
      setTimeout(resolve, GAME_CONSTANTS.OUT_SLOWMO_DURATION * 1000)
    );

    // 5. Arena 리메시
    this.arenaManager.remeshArena(this.gameState, playerId);

    // 6. arena_remesh_start 이벤트
    this.io.to(this.roomCode).emit('arena_remesh_start', {
      newArena: this.gameState.arena,
    });

    // 7. 리메시 애니메이션 대기
    await new Promise((resolve) =>
      setTimeout(resolve, GAME_CONSTANTS.REMESH_ANIMATION_DURATION * 1000)
    );

    // 8. arena_remesh_complete 이벤트
    // 플레이어 상태: INGAME_OUT → SPECTATOR
    this.io.to(this.roomCode).emit('arena_remesh_complete', {
      outPlayerId: playerId,
    });

    // 9. 게임 종료 조건 체크
    if (this.arenaManager.isGameOver(this.gameState)) {
      this.endGame();
      return;
    }

    // 10. 게임 루프 재시작
    this.startTickLoop();
  }

  /**
   * 게임 종료
   */
  private endGame(): void {
    if (!this.gameState) return;

    const winnerId = this.arenaManager.getWinnerId(this.gameState);

    // 게임 결과 계산
    const result = this.calculateGameResult(winnerId);

    // game_over 이벤트
    this.io.to(this.roomCode).emit('game_over', result);

    // 게임 루프 중지
    this.stop();
  }

  /**
   * 게임 결과 계산
   */
  private calculateGameResult(winnerId: string | undefined): any {
    if (!this.gameState) return null;

    const now = new Date();
    const startTime = new Date(this.gameState.startedAt);
    const totalDuration = (now.getTime() - startTime.getTime()) / 1000; // 초 단위

    // 랭킹 계산 (OUT 순서의 역순)
    const ranking: any[] = [];

    // 1위: 우승자
    if (winnerId) {
      const winnerStats = this.gameState.playerStats.get(winnerId);
      ranking.push({
        playerId: winnerId,
        rank: 1,
        survivalTime: winnerStats?.survivalTime || totalDuration,
        hitCount: winnerStats?.hitCount || 0,
        outReason: undefined,
      });
    }

    // 2위~N위: OUT 플레이어 (역순)
    for (let i = this.gameState.outPlayers.length - 1; i >= 0; i--) {
      const playerId = this.gameState.outPlayers[i];
      const stats = this.gameState.playerStats.get(playerId);

      ranking.push({
        playerId,
        rank: ranking.length + 1,
        survivalTime: stats?.survivalTime || 0,
        hitCount: stats?.hitCount || 0,
        outReason: 'MISS',
      });
    }

    // 플레이어별 통계
    const playerStats: Record<string, { hitCount: number; survivalTime: number }> = {};
    for (const [playerId, stats] of this.gameState.playerStats.entries()) {
      playerStats[playerId] = {
        hitCount: stats.hitCount,
        survivalTime: stats.survivalTime,
      };
    }

    return {
      winner: winnerId,
      ranking,
      stats: {
        totalDuration,
        totalHits: this.gameState.ball.hitCount,
        finalBallSpeed: this.gameState.ball.speed,
        playerStats,
      },
    };
  }

  /**
   * 게임 상태 브로드캐스트 (Delta)
   */
  private broadcastGameState(): void {
    if (!this.gameState) return;

    this.io.to(this.roomCode).emit('game_state_update', {
      tick: this.gameState.tick,
      ball: {
        position: this.gameState.ball.position,
        velocity: this.gameState.ball.velocity,
        speed: this.gameState.ball.speed,
      },
      // paddles는 변경 시만 전송 (최적화)
    });
  }

  /**
   * 패들 입력 처리
   */
  handlePaddleInput(playerId: string, direction: any): void {
    if (!this.gameState) return;

    const paddle = this.gameState.paddles.get(playerId);
    if (!paddle) return;

    paddle.direction = direction;

    // paddle_update 이벤트
    this.io.to(this.roomCode).emit('paddle_update', {
      userId: playerId,
      paddle: {
        position: paddle.position,
        velocity: paddle.velocity,
        direction: paddle.direction,
      },
    });
  }

  /**
   * 게임 중지
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.gameState = null;
  }

  /**
   * 게임 상태 직렬화 (클라이언트 전송용)
   */
  private serializeGameState(gameState: GameState): any {
    return {
      gameId: gameState.gameId,
      roomCode: gameState.roomCode,
      arena: gameState.arena,
      ball: gameState.ball,
      paddles: Array.from(gameState.paddles.entries()).map(([_id, paddle]) => ({
        ...paddle,
      })),
      alivePlayers: gameState.alivePlayers,
      outPlayers: gameState.outPlayers,
      tick: gameState.tick,
      startedAt: gameState.startedAt,
    };
  }

  /**
   * 게임 상태 가져오기
   */
  getGameState(): GameState | null {
    return this.gameState;
  }
}
