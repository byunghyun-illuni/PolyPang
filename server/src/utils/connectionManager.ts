/**
 * PolyPang Connection Manager
 * 출처: docs/planning/08_API명세서.md (섹션 7.2)
 *
 * 연결 상태 및 핑 측정 관리
 */

import { Socket } from 'socket.io';

/**
 * 연결 품질
 */
export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

/**
 * 연결 상태 페이로드
 */
export interface ConnectionStatus {
  connected: boolean;
  ping?: number; // ms
  quality: ConnectionQuality;
}

/**
 * 핑 측정 및 연결 상태 관리 클래스
 */
export class ConnectionManager {
  private pingData: Map<string, { ping: number; lastUpdate: number }> = new Map();

  /**
   * 핑 업데이트
   *
   * @param socketId - Socket ID
   * @param ping - 핑 (ms)
   */
  updatePing(socketId: string, ping: number): void {
    this.pingData.set(socketId, {
      ping,
      lastUpdate: Date.now(),
    });
  }

  /**
   * 핑 가져오기
   *
   * @param socketId - Socket ID
   * @returns 핑 (ms) 또는 undefined
   */
  getPing(socketId: string): number | undefined {
    return this.pingData.get(socketId)?.ping;
  }

  /**
   * 연결 품질 계산
   *
   * @param ping - 핑 (ms)
   * @returns 연결 품질
   */
  calculateQuality(ping: number | undefined): ConnectionQuality {
    if (ping === undefined) return 'disconnected';
    if (ping < 50) return 'excellent';
    if (ping < 100) return 'good';
    if (ping < 300) return 'poor';
    return 'disconnected';
  }

  /**
   * 연결 상태 가져오기
   *
   * @param socketId - Socket ID
   * @returns 연결 상태
   */
  getConnectionStatus(socketId: string): ConnectionStatus {
    const ping = this.getPing(socketId);
    const quality = this.calculateQuality(ping);

    return {
      connected: quality !== 'disconnected',
      ping,
      quality,
    };
  }

  /**
   * 연결 상태 전송
   *
   * @param socket - Socket 인스턴스
   */
  sendConnectionStatus(socket: Socket): void {
    const status = this.getConnectionStatus(socket.id);
    socket.emit('connection_status', status);
  }

  /**
   * 클라이언트 제거
   *
   * @param socketId - Socket ID
   */
  removeClient(socketId: string): void {
    this.pingData.delete(socketId);
  }
}

// 싱글톤 인스턴스
export const connectionManager = new ConnectionManager();
