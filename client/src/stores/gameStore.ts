/**
 * 멀티플레이어 게임 상태 관리 Store
 */

import { create } from 'zustand'
import type { Room, GameState, Player, PlayerId } from '@/types'

interface GameStore {
  // 연결 상태
  isConnected: boolean
  myUserId: string | null
  myNickname: string | null

  // 방 상태
  room: Room | null
  roomCode: string | null

  // 게임 상태
  gameState: GameState | null

  // Actions
  setConnected: (connected: boolean) => void
  setMyInfo: (userId: string, nickname: string) => void
  setRoom: (room: Room | null) => void
  setRoomCode: (code: string | null) => void
  setGameState: (state: GameState | null) => void
  updateGameState: (update: Partial<GameState>) => void
  updatePlayer: (userId: PlayerId, update: Partial<Player>) => void
  addPlayer: (player: Player) => void
  removePlayer: (userId: PlayerId) => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  isConnected: false,
  myUserId: null,
  myNickname: null,
  room: null,
  roomCode: null,
  gameState: null,

  // Actions
  setConnected: (connected) => set({ isConnected: connected }),

  setMyInfo: (userId, nickname) => set({ myUserId: userId, myNickname: nickname }),

  setRoom: (room) => set({ room, roomCode: room?.roomCode ?? null }),

  setRoomCode: (code) => set({ roomCode: code }),

  setGameState: (state) => {
    // 서버에서 paddles가 배열로 올 경우 Record로 변환
    if (state && Array.isArray((state as any).paddles)) {
      const paddlesArray = (state as any).paddles as any[]
      const paddlesRecord: Record<string, any> = {}
      paddlesArray.forEach((p) => {
        paddlesRecord[p.playerId] = p
      })
      state = { ...state, paddles: paddlesRecord }
    }
    set({ gameState: state })
  },

  updateGameState: (update) =>
    set((s) => ({
      gameState: s.gameState ? { ...s.gameState, ...update } : null,
    })),

  updatePlayer: (userId, update) =>
    set((s) => {
      if (!s.room) return s
      const players = s.room.players.map((p) =>
        p.userId === userId ? { ...p, ...update } : p
      )
      return { room: { ...s.room, players } }
    }),

  addPlayer: (player) =>
    set((s) => {
      if (!s.room) return s
      // 이미 있으면 무시
      if (s.room.players.some((p) => p.userId === player.userId)) return s
      return { room: { ...s.room, players: [...s.room.players, player] } }
    }),

  removePlayer: (userId) =>
    set((s) => {
      if (!s.room) return s
      const players = s.room.players.filter((p) => p.userId !== userId)
      return { room: { ...s.room, players } }
    }),

  reset: () =>
    set({
      room: null,
      roomCode: null,
      gameState: null,
    }),
}))
