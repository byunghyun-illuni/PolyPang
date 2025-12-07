/**
 * PolyPang Room 관리 Socket 핸들러
 * 출처: docs/planning/08_API명세서.md
 *
 * 이벤트:
 * - create_room
 * - join_room
 * - leave_room
 * - toggle_ready
 * - start_game
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Room, Player } from '../types/game.types';
import { RoomState, PlayerState } from '../types/enums';
import { generateRoomCode, isValidRoomCode } from '../utils/roomCodeGenerator';
import { GAME_CONSTANTS, PLAYER_COLORS } from '../utils/constants';
import { PolyPangEngine } from '../game/engines/PolyPangEngine';
import { ErrorCode, sendError, sendErrorCallback } from '../utils/errorHandler';

// In-memory storage
export const rooms = new Map<string, Room>();
export const gameEngines = new Map<string, PolyPangEngine>();

/**
 * create_room 핸들러
 */
export function handleCreateRoom(
  _io: SocketIOServer,
  socket: Socket,
  data: { nickname: string; maxPlayers?: number },
  callback?: (response: any) => void
) {
  const { nickname, maxPlayers = GAME_CONSTANTS.MAX_PLAYERS } = data;

  // 닉네임 검증
  if (!nickname || nickname.trim().length === 0 || nickname.length > 10) {
    sendError(socket, ErrorCode.INVALID_NICKNAME);
    if (callback) callback({ error: ErrorCode.INVALID_NICKNAME });
    return;
  }

  // 방 코드 생성 (중복 체크)
  let roomCode = generateRoomCode();
  while (rooms.has(roomCode)) {
    roomCode = generateRoomCode();
  }

  // 플레이어 생성
  const playerId = socket.id;
  const player: Player = {
    userId: playerId,
    nickname: nickname.trim(),
    state: PlayerState.LOBBY_WAIT,
    color: PLAYER_COLORS[0],
    isReady: false,
    isHost: true,
    joinedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  // 방 생성
  const room: Room = {
    roomCode,
    state: RoomState.LOBBY,
    players: new Map([[playerId, player]]),
    maxPlayers,
    hostId: playerId,
    createdAt: new Date().toISOString(),
  };

  rooms.set(roomCode, room);
  socket.join(roomCode);

  // 응답
  if (callback) callback({ success: true, roomCode });

  // room_joined 이벤트
  socket.emit('room_joined', {
    room: serializeRoom(room),
    userId: playerId,
  });
}

/**
 * join_room 핸들러
 */
export function handleJoinRoom(
  _io: SocketIOServer,
  socket: Socket,
  data: { roomCode: string; nickname: string },
  callback?: (response: any) => void
) {
  const { roomCode, nickname } = data;

  // 코드 유효성 검사
  if (!isValidRoomCode(roomCode)) {
    sendError(socket, ErrorCode.INVALID_CODE);
    if (callback) callback({ error: ErrorCode.INVALID_CODE });
    return;
  }

  // 방 존재 여부 확인
  const room = rooms.get(roomCode);
  if (!room) {
    sendError(socket, ErrorCode.ROOM_NOT_FOUND);
    if (callback) callback({ error: ErrorCode.ROOM_NOT_FOUND });
    return;
  }

  // 게임 진행 중 확인
  if (room.state !== RoomState.LOBBY) {
    sendError(socket, ErrorCode.GAME_IN_PROGRESS);
    if (callback) callback({ error: ErrorCode.GAME_IN_PROGRESS });
    return;
  }

  // 방 인원 확인
  if (room.players.size >= room.maxPlayers) {
    sendError(socket, ErrorCode.ROOM_FULL);
    if (callback) callback({ error: ErrorCode.ROOM_FULL });
    return;
  }

  // 닉네임 검증
  if (!nickname || nickname.trim().length === 0 || nickname.length > 10) {
    sendError(socket, ErrorCode.INVALID_NICKNAME);
    if (callback) callback({ error: ErrorCode.INVALID_NICKNAME });
    return;
  }

  // 플레이어 생성
  const playerId = socket.id;
  const colorIndex = room.players.size % PLAYER_COLORS.length;
  const player: Player = {
    userId: playerId,
    nickname: nickname.trim(),
    state: PlayerState.LOBBY_WAIT,
    color: PLAYER_COLORS[colorIndex],
    isReady: false,
    isHost: false,
    joinedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  room.players.set(playerId, player);
  socket.join(roomCode);

  // 응답
  if (callback) callback({ success: true, room: serializeRoom(room) });

  // 참가한 플레이어에게 room_joined 이벤트
  socket.emit('room_joined', {
    room: serializeRoom(room),
    userId: playerId,
  });

  // 기존 플레이어들에게 알림
  socket.to(roomCode).emit('player_joined', {
    userId: playerId,
    username: nickname,
    room: serializeRoom(room),
  });
}

/**
 * leave_room 핸들러
 */
export function handleLeaveRoom(
  io: SocketIOServer,
  socket: Socket,
  data: { roomCode: string },
  callback?: (response: any) => void
) {
  const { roomCode } = data;
  const room = rooms.get(roomCode);

  if (!room) {
    if (callback) callback({ success: true });
    return;
  }

  const playerId = socket.id;
  room.players.delete(playerId);

  socket.leave(roomCode);

  // 방이 비었으면 삭제
  if (room.players.size === 0) {
    rooms.delete(roomCode);
    const engine = gameEngines.get(roomCode);
    if (engine) {
      engine.stop();
      gameEngines.delete(roomCode);
    }
  } else {
    // Host 변경
    if (room.hostId === playerId) {
      const newHostId = Array.from(room.players.keys())[0];
      room.hostId = newHostId;
      const newHost = room.players.get(newHostId);
      if (newHost) {
        newHost.isHost = true;
      }

      io.to(roomCode).emit('host_changed', { newHostId });
    }

    // 남은 플레이어들에게 알림
    io.to(roomCode).emit('player_left', {
      userId: playerId,
      reason: 'LEFT',
    });
  }

  if (callback) callback({ success: true });
}

/**
 * toggle_ready 핸들러
 */
export function handleToggleReady(
  io: SocketIOServer,
  socket: Socket,
  roomCode: string
) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const playerId = socket.id;
  const player = room.players.get(playerId);

  if (!player) return;

  // Ready 토글
  if (player.state === PlayerState.LOBBY_WAIT) {
    player.state = PlayerState.LOBBY_READY;
    player.isReady = true;
  } else if (player.state === PlayerState.LOBBY_READY) {
    player.state = PlayerState.LOBBY_WAIT;
    player.isReady = false;
  }

  // player_ready_changed 이벤트
  io.to(roomCode).emit('player_ready_changed', {
    userId: playerId,
    isReady: player.isReady,
  });
}

/**
 * start_game 핸들러 (Host 전용)
 */
export async function handleStartGame(
  io: SocketIOServer,
  socket: Socket,
  roomCode: string,
  callback?: (response: any) => void
) {
  const room = rooms.get(roomCode);
  if (!room) {
    sendError(socket, ErrorCode.ROOM_NOT_FOUND);
    if (callback) callback({ error: ErrorCode.ROOM_NOT_FOUND });
    return;
  }

  const playerId = socket.id;

  // Host 권한 체크
  if (room.hostId !== playerId) {
    sendError(socket, ErrorCode.PERMISSION_DENIED);
    if (callback) callback({ error: ErrorCode.PERMISSION_DENIED });
    return;
  }

  // 인원 체크
  if (room.players.size < GAME_CONSTANTS.MIN_PLAYERS) {
    sendError(socket, ErrorCode.NOT_ENOUGH_PLAYERS);
    if (callback) callback({ error: ErrorCode.NOT_ENOUGH_PLAYERS });
    return;
  }

  // 카운트다운 시작
  room.state = RoomState.COUNTDOWN;

  for (let count = 3; count >= 1; count--) {
    io.to(roomCode).emit('game_countdown', { count });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 게임 시작
  room.state = RoomState.INGAME;

  // 플레이어 상태 변경: LOBBY_* → INGAME_ALIVE
  // 플레이어에게 sideIndex 할당
  let sideIndex = 0;
  for (const player of room.players.values()) {
    player.state = PlayerState.INGAME_ALIVE;
    player.sideIndex = sideIndex;
    sideIndex++;
  }

  // 게임 엔진 생성 및 시작
  const engine = new PolyPangEngine(io, roomCode);
  gameEngines.set(roomCode, engine);

  engine.start(room.players);

  if (callback) callback({ success: true });
}

/**
 * Room 객체 직렬화 (클라이언트 전송용)
 */
function serializeRoom(room: Room): any {
  return {
    roomCode: room.roomCode,
    state: room.state,
    players: Array.from(room.players.values()),
    maxPlayers: room.maxPlayers,
    hostId: room.hostId,
    createdAt: room.createdAt,
  };
}
