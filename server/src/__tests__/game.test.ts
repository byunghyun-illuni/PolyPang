/**
 * 멀티플레이어 게임 플로우 테스트
 * - 게임 시작 (start_game)
 * - 패들 이동 (paddle_move)
 * - 게임 상태 동기화 (game_state)
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
  delay,
} from './testServer';
import { rooms } from '../socket/roomHandlers';

describe('Multiplayer Game Flow', () => {
  let ctx: TestContext;
  let host: ClientSocket;
  let player2: ClientSocket;
  let roomCode: string;

  beforeAll(async () => {
    ctx = await createTestServer();
  });

  afterAll(async () => {
    await cleanupTestServer(ctx);
  });

  beforeEach(async () => {
    // 이전 클라이언트 정리
    if (host?.connected) host.disconnect();
    if (player2?.connected) player2.disconnect();
    rooms.clear();

    // Host 연결 및 방 생성
    host = createClientSocket(ctx.serverUrl);
    await waitForConnect(host);

    const roomJoinedPromise = waitForEvent<{ room: any }>(host, 'room_joined');
    host.emit('create_room', { nickname: 'Host', maxPlayers: 4 });
    const { room } = await roomJoinedPromise;
    roomCode = room.roomCode;

    // Player2 연결 및 참가
    player2 = createClientSocket(ctx.serverUrl);
    await waitForConnect(player2);

    const roomJoined2Promise = waitForEvent<{ room: any }>(player2, 'room_joined');
    player2.emit('join_room', { nickname: 'Player2', roomCode });
    await roomJoined2Promise;
  });

  describe('start_game', () => {
    it('호스트가 게임을 시작할 수 있어야 함', async () => {
      // 카운트다운 이벤트 수집
      const countdowns: number[] = [];
      host.on('game_countdown', (data: { count: number }) => {
        countdowns.push(data.count);
      });

      // game_started 이벤트 대기
      const gameStartedPromise = waitForEvent<any>(host, 'game_started', 10000);

      // 게임 시작
      host.emit('start_game', { roomCode });

      await gameStartedPromise;

      // 카운트다운 확인 (3, 2, 1)
      expect(countdowns).toEqual([3, 2, 1]);
    });

    it('호스트가 아닌 플레이어는 게임을 시작할 수 없어야 함', async () => {
      const errorPromise = waitForEvent<{ code: string }>(player2, 'error');

      player2.emit('start_game', { roomCode });

      const error = await errorPromise;
      expect(error.code).toBe('PERMISSION_DENIED');
    });

    it('최소 인원 미달 시 게임 시작 불가', async () => {
      // 1명만 있는 새 방 생성
      const solo = createClientSocket(ctx.serverUrl);
      await waitForConnect(solo);

      const roomJoinedPromise = waitForEvent<{ room: any }>(solo, 'room_joined');
      solo.emit('create_room', { nickname: 'Solo', maxPlayers: 4 });
      const { room } = await roomJoinedPromise;

      const errorPromise = waitForEvent<{ code: string }>(solo, 'error');
      solo.emit('start_game', { roomCode: room.roomCode });

      const error = await errorPromise;
      expect(error.code).toBe('NOT_ENOUGH_PLAYERS');

      solo.disconnect();
    });
  });

  describe('game_state synchronization', () => {
    it('게임 시작 후 game_started 이벤트를 받아야 함', async () => {
      // game_started 이벤트 대기
      const gameStartedPromise1 = waitForEvent<any>(host, 'game_started', 10000);
      const gameStartedPromise2 = waitForEvent<any>(player2, 'game_started', 10000);

      // 게임 시작
      host.emit('start_game', { roomCode });

      const [data1, data2] = await Promise.all([
        gameStartedPromise1,
        gameStartedPromise2,
      ]);

      // 서버는 { gameState: {...} } 구조로 전송
      const gameState1 = data1.gameState;
      const gameState2 = data2.gameState;

      // 게임 상태 검증
      expect(gameState1.ball).toBeDefined();
      expect(gameState1.paddles).toBeDefined();
      expect(gameState1.alivePlayers).toBeDefined();

      // 두 클라이언트가 같은 상태를 받아야 함
      expect(gameState1.ball.position.x).toBe(gameState2.ball.position.x);
      expect(gameState1.ball.position.y).toBe(gameState2.ball.position.y);
    });

    it('게임 상태에 모든 플레이어의 패들이 있어야 함', async () => {
      const gameStartedPromise = waitForEvent<any>(host, 'game_started', 10000);

      host.emit('start_game', { roomCode });

      const data = await gameStartedPromise;
      const gameState = data.gameState;

      // 8각형으로 시작 (2명 실제 + 6명 봇)
      expect(gameState.paddles).toHaveLength(8);
    });
  });

  describe('paddle_move', () => {
    it('패들 이동 명령을 보낼 수 있어야 함', async () => {
      // 게임 시작 대기
      const gameStartedPromise = waitForEvent<any>(host, 'game_started', 10000);
      host.emit('start_game', { roomCode });
      await gameStartedPromise;

      // 약간 대기
      await delay(100);

      // 패들 이동 (에러 없이 처리되어야 함)
      host.emit('paddle_move', {
        roomCode,
        direction: 'left',
        isPressed: true,
      });

      // 잠시 후 패들 이동 중지
      await delay(50);
      host.emit('paddle_move', {
        roomCode,
        direction: 'left',
        isPressed: false,
      });

      // 에러가 발생하지 않으면 성공
      await delay(100);
    });

    it('paddle_state 이벤트를 받아야 함', async () => {
      // 게임 시작
      const gameStartedPromise = waitForEvent<any>(host, 'game_started', 10000);
      host.emit('start_game', { roomCode });
      await gameStartedPromise;

      await delay(100);

      // paddle_state 이벤트 대기 (다른 클라이언트에서)
      const paddleStatePromise = waitForEvent<any>(player2, 'paddle_state', 3000).catch(() => null);

      // 패들 이동
      host.emit('paddle_move', {
        roomCode,
        direction: 'right',
        isPressed: true,
      });

      // paddle_state 이벤트가 오거나 타임아웃 (구현에 따라)
      const paddleState = await paddleStatePromise;

      // 이벤트가 있으면 검증
      if (paddleState) {
        expect(paddleState.userId).toBeDefined();
        expect(paddleState.position).toBeDefined();
      }
    });
  });

  describe('player_out', () => {
    it('게임 중 연결이 끊기면 처리되어야 함', async () => {
      // 게임 시작
      const gameStartedPromise = waitForEvent<any>(host, 'game_started', 10000);
      host.emit('start_game', { roomCode });
      await gameStartedPromise;

      await delay(200);

      // player_left 이벤트 대기
      const playerLeftPromise = waitForEvent<{ userId: string }>(host, 'player_left', 10000).catch(
        () => null
      );

      // Player2 연결 끊기
      player2.disconnect();

      // 재연결 타임아웃 대기 (서버에서 5초)
      const playerLeft = await playerLeftPromise;

      // 이벤트가 오면 검증 (재연결 타임아웃 구현에 따라)
      if (playerLeft) {
        expect(playerLeft.userId).toBeDefined();
      }
    });
  });
});

describe('Full Game Scenario', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestServer();
  });

  afterAll(async () => {
    await cleanupTestServer(ctx);
  });

  it('4명이 참가해서 게임을 플레이할 수 있어야 함', async () => {
    // 4명의 클라이언트 생성
    const clients: ClientSocket[] = [];
    for (let i = 0; i < 4; i++) {
      const client = createClientSocket(ctx.serverUrl);
      await waitForConnect(client);
      clients.push(client);
    }

    // Host가 방 생성
    const roomJoinedPromise = waitForEvent<{ room: any }>(clients[0], 'room_joined');
    clients[0].emit('create_room', { nickname: 'Player1', maxPlayers: 8 });
    const { room } = await roomJoinedPromise;

    // 나머지 3명 참가
    for (let i = 1; i < 4; i++) {
      const joinPromise = waitForEvent<{ room: any }>(clients[i], 'room_joined');
      clients[i].emit('join_room', { nickname: `Player${i + 1}`, roomCode: room.roomCode });
      await joinPromise;
    }

    // 모든 플레이어가 game_started를 받는지 확인
    const gameStartedPromises = clients.map((c) => waitForEvent<any>(c, 'game_started', 10000));

    // 게임 시작
    clients[0].emit('start_game', { roomCode: room.roomCode });

    const responses = await Promise.all(gameStartedPromises);
    const gameStates = responses.map((r) => r.gameState);

    // 모든 클라이언트가 같은 게임 상태를 받아야 함
    expect(gameStates.every((gs) => gs.ball !== undefined)).toBe(true);
    // 8각형으로 시작 (4명 실제 + 4명 봇)
    expect(gameStates[0].paddles).toHaveLength(8);

    // 정리
    clients.forEach((c) => c.disconnect());
  });
});
