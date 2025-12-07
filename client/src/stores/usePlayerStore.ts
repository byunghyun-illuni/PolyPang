/**
 * 플레이어 상태 스토어 (Zustand)
 *
 * 관리 항목: players, myPlayerId, alivePlayers
 */

import { create } from 'zustand'
import type { Player, PlayerId } from '@/types'

interface PlayerStore {
  // State
  players: Player[]
  myPlayerId: PlayerId | null
  alivePlayers: PlayerId[]
  outPlayers: PlayerId[]

  // Computed (셀렉터에서 사용)
  myPlayer: Player | null
  myPlayerIndex: number
  isHost: boolean

  // Actions
  setPlayers: (players: Player[]) => void
  addPlayer: (player: Player) => void
  removePlayer: (playerId: PlayerId) => void
  updatePlayer: (playerId: PlayerId, updates: Partial<Player>) => void
  setMyPlayerId: (playerId: PlayerId) => void
  setAlivePlayers: (alivePlayers: PlayerId[]) => void
  setOutPlayers: (outPlayers: PlayerId[]) => void
  reset: () => void
}

const initialState = {
  players: [],
  myPlayerId: null,
  alivePlayers: [],
  outPlayers: [],
  myPlayer: null,
  myPlayerIndex: -1,
  isHost: false,
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initialState,

  setPlayers: (players) => {
    const { myPlayerId } = get()
    const myPlayer = players.find((p) => p.userId === myPlayerId) || null
    const myPlayerIndex = players.findIndex((p) => p.userId === myPlayerId)
    const isHost = myPlayer?.isHost || false

    set({
      players,
      myPlayer,
      myPlayerIndex,
      isHost,
    })
  },

  addPlayer: (player) =>
    set((state) => {
      const players = [...state.players, player]
      const myPlayer =
        players.find((p) => p.userId === state.myPlayerId) || null
      const myPlayerIndex = players.findIndex(
        (p) => p.userId === state.myPlayerId
      )
      const isHost = myPlayer?.isHost || false

      return {
        players,
        myPlayer,
        myPlayerIndex,
        isHost,
      }
    }),

  removePlayer: (playerId) =>
    set((state) => {
      const players = state.players.filter((p) => p.userId !== playerId)
      const myPlayer =
        players.find((p) => p.userId === state.myPlayerId) || null
      const myPlayerIndex = players.findIndex(
        (p) => p.userId === state.myPlayerId
      )
      const isHost = myPlayer?.isHost || false

      return {
        players,
        myPlayer,
        myPlayerIndex,
        isHost,
      }
    }),

  updatePlayer: (playerId, updates) =>
    set((state) => {
      const players = state.players.map((p) =>
        p.userId === playerId ? { ...p, ...updates } : p
      )
      const myPlayer =
        players.find((p) => p.userId === state.myPlayerId) || null
      const myPlayerIndex = players.findIndex(
        (p) => p.userId === state.myPlayerId
      )
      const isHost = myPlayer?.isHost || false

      return {
        players,
        myPlayer,
        myPlayerIndex,
        isHost,
      }
    }),

  setMyPlayerId: (playerId) => {
    set({ myPlayerId: playerId })
    const { setPlayers, players } = get()
    setPlayers(players) // 재계산 트리거
  },

  setAlivePlayers: (alivePlayers) => set({ alivePlayers }),

  setOutPlayers: (outPlayers) => set({ outPlayers }),

  reset: () => set(initialState),
}))

/**
 * 셀렉터: 내 플레이어 정보만 가져오기
 */
export const selectMyPlayer = (state: PlayerStore) => state.myPlayer

/**
 * 셀렉터: Alive 플레이어 수
 */
export const selectAliveCount = (state: PlayerStore) => state.alivePlayers.length
