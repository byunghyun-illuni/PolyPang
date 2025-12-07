/**
 * 방 상태 스토어 (Zustand)
 *
 * 관리 항목: roomCode, roomState, hostId
 */

import { create } from 'zustand'
import type { RoomCode, PlayerId, RoomState as RoomStateEnum } from '@/types'

interface RoomStore {
  // State
  roomCode: RoomCode | null
  roomState: RoomStateEnum | null
  hostId: PlayerId | null
  maxPlayers: number

  // Actions
  setRoom: (roomCode: RoomCode, hostId: PlayerId, maxPlayers?: number) => void
  setRoomState: (roomState: RoomStateEnum) => void
  setHost: (hostId: PlayerId) => void
  reset: () => void
}

const initialState = {
  roomCode: null,
  roomState: null,
  hostId: null,
  maxPlayers: 8,
}

export const useRoomStore = create<RoomStore>((set) => ({
  ...initialState,

  setRoom: (roomCode, hostId, maxPlayers = 8) =>
    set({
      roomCode,
      hostId,
      maxPlayers,
    }),

  setRoomState: (roomState) => set({ roomState }),

  setHost: (hostId) => set({ hostId }),

  reset: () => set(initialState),
}))
