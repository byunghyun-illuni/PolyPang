/**
 * 테스트용 서버 설정
 * 각 테스트에서 독립적인 서버 인스턴스를 생성
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { setupPolyPangHandlers } from '../socket/polypangHandlers';
import { rooms, gameEngines } from '../socket/roomHandlers';

export interface TestContext {
  io: SocketIOServer;
  server: http.Server;
  port: number;
  serverUrl: string;
}

/**
 * 테스트 서버 생성
 */
export function createTestServer(): Promise<TestContext> {
  return new Promise((resolve) => {
    const app = express();
    const server = http.createServer(app);
    const io = new SocketIOServer(server, {
      cors: { origin: '*' },
    });

    io.on('connection', (socket) => {
      setupPolyPangHandlers(io, socket);
    });

    // 랜덤 포트로 서버 시작
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' ? address!.port : 0;
      resolve({
        io,
        server,
        port,
        serverUrl: `http://localhost:${port}`,
      });
    });
  });
}

/**
 * 테스트 서버 정리
 */
export async function cleanupTestServer(ctx: TestContext): Promise<void> {
  // 모든 방과 게임 엔진 정리
  for (const [roomCode, engine] of gameEngines.entries()) {
    engine.stop();
    gameEngines.delete(roomCode);
  }
  rooms.clear();

  return new Promise((resolve) => {
    ctx.io.close(() => {
      ctx.server.close(() => {
        resolve();
      });
    });
  });
}

/**
 * 테스트용 클라이언트 소켓 생성
 */
export function createClientSocket(serverUrl: string): ClientSocket {
  return ioClient(serverUrl, {
    autoConnect: false,
    transports: ['websocket'],
  });
}

/**
 * 소켓 연결 대기
 */
export function waitForConnect(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 5000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.connect();
  });
}

/**
 * 소켓 이벤트 대기
 */
export function waitForEvent<T>(socket: ClientSocket, event: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * 지정 시간 대기
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
