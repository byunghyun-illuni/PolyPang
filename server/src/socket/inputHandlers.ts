/**
 * PolyPang 입력 처리 Socket 핸들러
 * 출처: docs/planning/08_API명세서.md
 *
 * 이벤트:
 * - paddle_move
 * - send_emoji
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { gameEngines } from './roomHandlers';
import { PaddleDirection } from '../types/enums';

/**
 * paddle_move 핸들러
 *
 * @param io - Socket.IO 서버
 * @param socket - Socket
 * @param data - { roomCode, direction }
 */
export function handlePaddleMove(
  _io: SocketIOServer,
  socket: Socket,
  data: { roomCode: string; direction: PaddleDirection }
) {
  const { roomCode, direction } = data;

  const engine = gameEngines.get(roomCode);
  if (!engine) return;

  const playerId = socket.id;
  engine.handlePaddleInput(playerId, direction);
}

/**
 * send_emoji 핸들러
 *
 * @param io - Socket.IO 서버
 * @param socket - Socket
 * @param data - { roomCode, emoji }
 */
export function handleSendEmoji(
  io: SocketIOServer,
  socket: Socket,
  data: { roomCode: string; emoji: string }
) {
  const { roomCode, emoji } = data;

  const playerId = socket.id;

  // 모든 플레이어에게 브로드캐스트
  io.to(roomCode).emit('emoji_reaction', {
    userId: playerId,
    emoji,
    position: { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 }, // 랜덤 위치
  });
}
