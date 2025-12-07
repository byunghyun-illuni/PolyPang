/**
 * PolyPang Reconnection Manager
 * 출처: docs/planning/01_PRD_게임기획.md (섹션 13.1)
 *
 * 연결 끊김 및 재연결 관리
 *
 * TODO: 재연결 시스템 고도화 필요
 * - 재연결 시 게임 상태 복원
 * - LOBBY vs INGAME 다른 타임아웃 처리
 * - Socket ID 변경 시 플레이어 매칭
 */

import { Server as SocketIOServer } from 'socket.io';
import { Player } from '../types/game.types';
import { PlayerState } from '../types/enums';
import { GAME_CONSTANTS } from './constants';

/**
 * 연결 끊김 정보
 */
interface DisconnectionInfo {
  playerId: string;
  roomCode: string;
  disconnectedAt: number;
  state: PlayerState;
  timeoutId: NodeJS.Timeout;
}

/**
 * Reconnection Manager
 *
 * 기본 구조만 구현. 향후 고도화 필요.
 */
export class ReconnectionManager {
  private disconnections: Map<string, DisconnectionInfo> = new Map();

  /**
   * 플레이어 연결 끊김 처리
   *
   * @param io - Socket.IO 서버
   * @param player - 플레이어
   * @param roomCode - 방 코드
   * @param onTimeout - 타임아웃 콜백
   */
  handleDisconnection(
    io: SocketIOServer,
    player: Player,
    roomCode: string,
    onTimeout: (playerId: string) => void
  ): void {
    const playerId = player.userId;

    // 이미 처리 중이면 무시
    if (this.disconnections.has(playerId)) {
      return;
    }

    const disconnectedAt = Date.now();
    player.disconnectedAt = new Date(disconnectedAt).toISOString();
    player.state = PlayerState.DISCONNECTED;

    // 타임아웃 설정
    const timeout = GAME_CONSTANTS.DISCONNECT_TIMEOUT;
    const timeoutId = setTimeout(() => {
      console.log(`[Reconnection] Timeout for player ${playerId}`);
      this.disconnections.delete(playerId);
      onTimeout(playerId);
    }, timeout);

    this.disconnections.set(playerId, {
      playerId,
      roomCode,
      disconnectedAt,
      state: player.state,
      timeoutId,
    });

    // 방에 연결 끊김 알림
    io.to(roomCode).emit('player_disconnected', {
      userId: playerId,
      timeout: timeout / 1000, // 초 단위
    });

    console.log(`[Reconnection] Player ${playerId} disconnected. Timeout: ${timeout}ms`);
  }

  /**
   * 재연결 성공 처리
   *
   * @param playerId - 플레이어 ID
   * @returns 재연결 성공 여부
   */
  handleReconnection(playerId: string): boolean {
    const info = this.disconnections.get(playerId);
    if (!info) {
      return false;
    }

    // 타임아웃 취소
    clearTimeout(info.timeoutId);
    this.disconnections.delete(playerId);

    console.log(`[Reconnection] Player ${playerId} reconnected successfully`);
    return true;
  }

  /**
   * 연결 끊김 정보 가져오기
   *
   * @param playerId - 플레이어 ID
   * @returns 연결 끊김 정보
   */
  getDisconnectionInfo(playerId: string): DisconnectionInfo | undefined {
    return this.disconnections.get(playerId);
  }

  /**
   * 모든 타임아웃 정리
   */
  cleanup(): void {
    for (const info of this.disconnections.values()) {
      clearTimeout(info.timeoutId);
    }
    this.disconnections.clear();
  }
}

// 싱글톤 인스턴스
export const reconnectionManager = new ReconnectionManager();
