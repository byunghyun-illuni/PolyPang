/**
 * 게임 상태 스토어 (Zustand)
 *
 * 관리 항목: ball, arena, tick
 */

import { create } from 'zustand'
import type { Ball, Arena, GameState } from '@/types'

interface GameStore {
  // State
  gameState: GameState | null
  ball: Ball | null
  arena: Arena | null
  tick: number

  // Actions
  setGameState: (gameState: GameState) => void
  updateBall: (ball: Partial<Ball>) => void
  updateArena: (arena: Partial<Arena>) => void
  updateTick: (tick: number) => void
  reset: () => void
}

const initialState = {
  gameState: null,
  ball: null,
  arena: null,
  tick: 0,
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setGameState: (gameState) =>
    set({
      gameState,
      ball: gameState.ball,
      arena: gameState.arena,
      tick: gameState.tick,
    }),

  updateBall: (ballUpdate) =>
    set((state) => ({
      ball: state.ball ? { ...state.ball, ...ballUpdate } : null,
    })),

  updateArena: (arenaUpdate) =>
    set((state) => ({
      arena: state.arena ? { ...state.arena, ...arenaUpdate } : null,
    })),

  updateTick: (tick) => set({ tick }),

  reset: () => set(initialState),
}))
