/**
 * Room 핸들러 테스트
 * - create_room
 * - join_room
 * - leave_room
 * - toggle_ready
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Socket as ClientSocket } from 'socket.io-client';
import {
  TestContext,
  createTestServer,
  cleanupTestServer,
  createClientSocket,
  waitForConnect,
  waitForEvent,
} from './testServer';
import { rooms } from '../socket/roomHandlers';

describe('Room Handlers', () => {
  let ctx: TestContext;
  let client1: ClientSocket;
  let client2: ClientSocket;

  beforeAll(async () => {
    ctx = await createTestServer();
  });

  afterAll(async () => {
    await cleanupTestServer(ctx);
  });

  beforeEach(async () => {
    // 이전 테스트의 클라이언트 정리
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();

    // 방 초기화
    rooms.clear();
  });

  describe('create_room', () => {
    it('방을 생성하고 room_joined 이벤트를 받아야 함', async () => {
      client1 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client1);

      // room_joined 이벤트 대기
      const roomJoinedPromise = waitForEvent<{ room: any; userId: string }>(client1, 'room_joined');

      // create_room 이벤트 발송
      client1.emit('create_room', { nickname: 'Player1', maxPlayers: 4 });

      const data = await roomJoinedPromise;

      expect(data.room).toBeDefined();
      expect(data.room.roomCode).toHaveLength(6);
      expect(data.room.players).toHaveLength(1);
      expect(data.room.players[0].nickname).toBe('Player1');
      expect(data.room.players[0].isHost).toBe(true);
      expect(data.userId).toBe(client1.id);
    });

    it('빈 닉네임으로 방 생성 시 에러를 반환해야 함', async () => {
      client1 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client1);

      const errorPromise = waitForEvent<{ code: string }>(client1, 'error');

      client1.emit('create_room', { nickname: '', maxPlayers: 4 });

      const error = await errorPromise;
      expect(error.code).toBe('INVALID_NICKNAME');
    });

    it('10자 초과 닉네임으로 방 생성 시 에러를 반환해야 함', async () => {
      client1 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client1);

      const errorPromise = waitForEvent<{ code: string }>(client1, 'error');

      client1.emit('create_room', { nickname: '12345678901', maxPlayers: 4 });

      const error = await errorPromise;
      expect(error.code).toBe('INVALID_NICKNAME');
    });
  });

  describe('join_room', () => {
    it('다른 플레이어가 방에 참가할 수 있어야 함', async () => {
      // Player1이 방 생성
      client1 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client1);

      const roomJoinedPromise1 = waitForEvent<{ room: any; userId: string }>(client1, 'room_joined');
      client1.emit('create_room', { nickname: 'Host', maxPlayers: 4 });
      const { room } = await roomJoinedPromise1;

      // Player2가 방 참가
      client2 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client2);

      // player_joined 이벤트 (Host가 받음)
      const playerJoinedPromise = waitForEvent<{ userId: string; room: any }>(client1, 'player_joined');
      // room_joined 이벤트 (참가자가 받음)
      const roomJoinedPromise2 = waitForEvent<{ room: any; userId: string }>(client2, 'room_joined');

      client2.emit('join_room', { nickname: 'Guest', roomCode: room.roomCode });

      const [playerJoined, roomJoined2] = await Promise.all([
        playerJoinedPromise,
        roomJoinedPromise2,
      ]);

      // Host가 받은 이벤트 검증
      expect(playerJoined.room.players).toHaveLength(2);

      // 참가자가 받은 이벤트 검증
      expect(roomJoined2.room.players).toHaveLength(2);
      expect(roomJoined2.userId).toBe(client2.id);
    });

    it('존재하지 않는 방에 참가 시 에러를 반환해야 함', async () => {
      client1 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client1);

      const errorPromise = waitForEvent<{ code: string }>(client1, 'error');

      client1.emit('join_room', { nickname: 'Player', roomCode: 'ABCDEF' });

      const error = await errorPromise;
      expect(error.code).toBe('ROOM_NOT_FOUND');
    });

    it('방 정원 초과 시 에러를 반환해야 함', async () => {
      // maxPlayers: 2로 방 생성
      client1 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client1);

      const roomJoinedPromise1 = waitForEvent<{ room: any }>(client1, 'room_joined');
      client1.emit('create_room', { nickname: 'Host', maxPlayers: 2 });
      const { room } = await roomJoinedPromise1;

      // 2번째 플레이어 참가
      client2 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client2);

      const roomJoinedPromise2 = waitForEvent<{ room: any }>(client2, 'room_joined');
      client2.emit('join_room', { nickname: 'Player2', roomCode: room.roomCode });
      await roomJoinedPromise2;

      // 3번째 플레이어 참가 시도 (에러)
      const client3 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client3);

      const errorPromise = waitForEvent<{ code: string }>(client3, 'error');
      client3.emit('join_room', { nickname: 'Player3', roomCode: room.roomCode });

      const error = await errorPromise;
      expect(error.code).toBe('ROOM_FULL');

      client3.disconnect();
    });
  });

  describe('leave_room', () => {
    it('플레이어가 방을 나가면 다른 플레이어에게 알림이 가야 함', async () => {
      // 방 생성 및 참가
      client1 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client1);

      const roomJoinedPromise1 = waitForEvent<{ room: any }>(client1, 'room_joined');
      client1.emit('create_room', { nickname: 'Host', maxPlayers: 4 });
      const { room } = await roomJoinedPromise1;

      client2 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client2);

      const roomJoinedPromise2 = waitForEvent<{ room: any }>(client2, 'room_joined');
      client2.emit('join_room', { nickname: 'Guest', roomCode: room.roomCode });
      await roomJoinedPromise2;

      // player_left 이벤트 대기
      const playerLeftPromise = waitForEvent<{ userId: string; reason: string }>(client1, 'player_left');

      // Guest가 방 나가기
      client2.emit('leave_room', { roomCode: room.roomCode });

      const playerLeft = await playerLeftPromise;
      expect(playerLeft.userId).toBe(client2.id);
      expect(playerLeft.reason).toBe('LEFT');
    });

    it('호스트가 나가면 다른 플레이어가 호스트가 되어야 함', async () => {
      // 방 생성 및 참가
      client1 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client1);

      const roomJoinedPromise1 = waitForEvent<{ room: any }>(client1, 'room_joined');
      client1.emit('create_room', { nickname: 'Host', maxPlayers: 4 });
      const { room } = await roomJoinedPromise1;

      client2 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client2);

      const roomJoinedPromise2 = waitForEvent<{ room: any }>(client2, 'room_joined');
      client2.emit('join_room', { nickname: 'Guest', roomCode: room.roomCode });
      await roomJoinedPromise2;

      // host_changed 이벤트 대기
      const hostChangedPromise = waitForEvent<{ newHostId: string }>(client2, 'host_changed');

      // Host가 방 나가기
      client1.emit('leave_room', { roomCode: room.roomCode });

      const hostChanged = await hostChangedPromise;
      expect(hostChanged.newHostId).toBe(client2.id);
    });
  });

  describe('toggle_ready', () => {
    it('Ready 상태를 토글할 수 있어야 함', async () => {
      // 방 생성 및 참가
      client1 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client1);

      const roomJoinedPromise1 = waitForEvent<{ room: any }>(client1, 'room_joined');
      client1.emit('create_room', { nickname: 'Host', maxPlayers: 4 });
      const { room } = await roomJoinedPromise1;

      client2 = createClientSocket(ctx.serverUrl);
      await waitForConnect(client2);

      const roomJoinedPromise2 = waitForEvent<{ room: any }>(client2, 'room_joined');
      client2.emit('join_room', { nickname: 'Guest', roomCode: room.roomCode });
      await roomJoinedPromise2;

      // player_ready_changed 이벤트 대기
      const readyChangedPromise = waitForEvent<{ userId: string; isReady: boolean }>(
        client1,
        'player_ready_changed'
      );

      // Guest가 Ready
      client2.emit('toggle_ready', { roomCode: room.roomCode });

      const readyChanged = await readyChangedPromise;
      expect(readyChanged.userId).toBe(client2.id);
      expect(readyChanged.isReady).toBe(true);
    });
  });
});
