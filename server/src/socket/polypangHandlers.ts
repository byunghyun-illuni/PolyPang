/**
 * PolyPang Socket 이벤트 핸들러 통합
 *
 * 모든 PolyPang 관련 Socket 이벤트를 여기서 처리합니다.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleToggleReady,
  handleStartGame,
  rooms,
  gameEngines,
} from './roomHandlers';
import { handlePaddleMove, handleSendEmoji } from './inputHandlers';
import { connectionManager } from '../utils/connectionManager';
import { reconnectionManager } from '../utils/reconnectionManager';
import { PlayerState } from '../types/enums';

/**
 * 플레이어가 속한 방 찾기 (rooms Map에서 검색)
 */
function findPlayerRoom(playerId: string): string | undefined {
  for (const [roomCode, room] of rooms.entries()) {
    if (room.players.has(playerId)) {
      return roomCode;
    }
  }
  return undefined;
}

/**
 * PolyPang Socket 이벤트 핸들러 설정
 *
 * @param io - Socket.IO 서버
 * @param socket - 클라이언트 Socket
 */
export function setupPolyPangHandlers(io: SocketIOServer, socket: Socket): void {
  console.log(`[PolyPang] Client connected: ${socket.id}`);

  // ==================== Room 관리 ====================

  /**
   * create_room - 방 생성
   */
  socket.on('create_room', (data, callback) => {
    console.log(`[create_room] ${socket.id}:`, data);
    handleCreateRoom(io, socket, data, callback);
  });

  /**
   * join_room - 방 참가
   */
  socket.on('join_room', (data, callback) => {
    console.log(`[join_room] ${socket.id}:`, data);
    handleJoinRoom(io, socket, data, callback);
  });

  /**
   * leave_room - 방 나가기
   */
  socket.on('leave_room', (data, callback) => {
    console.log(`[leave_room] ${socket.id}:`, data);
    handleLeaveRoom(io, socket, data, callback);
  });

  /**
   * toggle_ready - Ready 토글
   */
  socket.on('toggle_ready', () => {
    // rooms Map에서 플레이어가 실제로 있는 방 찾기
    const roomCode = findPlayerRoom(socket.id);
    console.log(`[toggle_ready] ${socket.id}: roomCode=${roomCode}`);
    if (!roomCode) return;
    handleToggleReady(io, socket, roomCode);
  });

  /**
   * start_game - 게임 시작 (Host 전용)
   */
  socket.on('start_game', (callback) => {
    const roomCode = findPlayerRoom(socket.id);
    console.log(`[start_game] ${socket.id}: roomCode=${roomCode}`);
    if (!roomCode) return;
    handleStartGame(io, socket, roomCode, callback);
  });

  /**
   * rejoin_game - 게임 화면에서 소켓 재연결 시 방에 다시 join
   */
  socket.on('rejoin_game', (data: { roomCode: string }, callback) => {
    const { roomCode } = data;
    console.log(`[rejoin_game] ${socket.id}: roomCode=${roomCode}`);

    const room = rooms.get(roomCode);
    if (!room) {
      console.log(`[rejoin_game] Room ${roomCode} not found`);
      if (callback) callback({ success: false, error: 'Room not found' });
      return;
    }

    // Socket Room에 join
    socket.join(roomCode);

    // 현재 게임 상태 전송
    const engine = gameEngines.get(roomCode);
    if (engine) {
      const gameState = engine.getGameState();
      if (gameState) {
        socket.emit('game_state_sync', { gameState });
      }
    }

    console.log(`[rejoin_game] ${socket.id} rejoined room ${roomCode}`);
    if (callback) callback({ success: true });
  });

  // ==================== 게임 입력 ====================

  /**
   * paddle_move - 패들 이동
   */
  socket.on('paddle_move', (data) => {
    // 로그 너무 많아서 주석 처리
    // console.log(`[paddle_move] ${socket.id}:`, data);
    handlePaddleMove(io, socket, data);
  });

  /**
   * send_emoji - 이모지 전송
   */
  socket.on('send_emoji', (data) => {
    console.log(`[send_emoji] ${socket.id}:`, data);
    handleSendEmoji(io, socket, data);
  });

  // ==================== 연결 해제 ====================

  /**
   * disconnect - 연결 끊김
   */
  socket.on('disconnect', () => {
    console.log(`[PolyPang] Client disconnected: ${socket.id}`);

    // 연결 상태 제거
    connectionManager.removeClient(socket.id);

    // 모든 방에서 재연결 대기 또는 퇴장 처리
    for (const [roomCode, room] of rooms.entries()) {
      const player = room.players.get(socket.id);
      if (player) {
        console.log(`[disconnect] Player ${socket.id} disconnected from room ${roomCode}`);

        // INGAME 중이면 재연결 대기 (5초)
        if (
          player.state === PlayerState.INGAME_ALIVE ||
          player.state === PlayerState.SPECTATOR
        ) {
          reconnectionManager.handleDisconnection(io, player, roomCode, (playerId) => {
            // 타임아웃 시 퇴장 처리
            console.log(`[disconnect] Player ${playerId} timeout. Removing from room.`);
            handleLeaveRoom(io, socket, { roomCode });
          });
        } else {
          // LOBBY 중이면 즉시 퇴장
          handleLeaveRoom(io, socket, { roomCode });
        }
      }
    }
  });

  // ==================== 재연결 ====================

  /**
   * reconnect - 재연결
   */
  socket.on('reconnect', (data: { oldSocketId?: string }) => {
    console.log(`[reconnect] Client ${socket.id} attempting to reconnect`);

    const oldSocketId = data?.oldSocketId;
    if (oldSocketId && reconnectionManager.handleReconnection(oldSocketId)) {
      // 재연결 성공: 플레이어 정보 이동
      for (const [roomCode, room] of rooms.entries()) {
        const player = room.players.get(oldSocketId);
        if (player) {
          // 플레이어 Map 업데이트
          room.players.delete(oldSocketId);
          player.userId = socket.id;
          player.state = PlayerState.INGAME_ALIVE; // 또는 이전 상태 복원
          room.players.set(socket.id, player);

          // Socket Room 재가입
          socket.join(roomCode);

          // 방에 재연결 알림
          io.to(roomCode).emit('player_reconnected', {
            userId: socket.id,
            oldUserId: oldSocketId,
          });

          console.log(`[reconnect] Player ${oldSocketId} → ${socket.id} reconnected to room ${roomCode}`);
        }
      }
    }
  });

  // ==================== 핑/퐁 (연결 상태 확인) ====================

  /**
   * ping - 연결 상태 확인
   */
  socket.on('ping', (data: { timestamp: number }, callback) => {
    const serverTimestamp = Date.now();
    const rtt = data.timestamp ? serverTimestamp - data.timestamp : 0;

    // 핑 업데이트
    connectionManager.updatePing(socket.id, rtt);

    // 연결 상태 전송
    connectionManager.sendConnectionStatus(socket);

    if (callback) {
      callback({ timestamp: serverTimestamp });
    }
  });
}

/**
 * 전체 Room 목록 가져오기 (디버깅/모니터링용)
 */
export function getRoomsList() {
  return Array.from(rooms.entries()).map(([roomCode, room]) => ({
    roomCode,
    state: room.state,
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    hostId: room.hostId,
    createdAt: room.createdAt,
  }));
}

/**
 * 활성 게임 엔진 목록 (디버깅용)
 */
export function getActiveGames() {
  return Array.from(gameEngines.entries()).map(([roomCode, engine]) => ({
    roomCode,
    gameState: engine.getGameState() ? 'ACTIVE' : 'STOPPED',
  }));
}
