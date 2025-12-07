/**
 * 게임 상태 관리 Hook
 *
 * 역할:
 * - Alive 플레이어 관리
 * - OUT 처리 (플레이어 제거)
 * - Arena 축소 (정N → 정N-1각형)
 * - 승자 판정
 * - 게임 재시작
 *
 * 출처: docs/planning/01_PRD_게임기획.md
 */

import { useState, useCallback, useEffect } from 'react'

export type GameStatus = 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED'
export type PlayerStatus = 'ALIVE' | 'OUT' | 'SPECTATOR'

export interface Player {
  id: string
  nickname: string
  status: PlayerStatus
  outOrder?: number // OUT된 순서 (1 = 1등 탈락, 2 = 2등 탈락...)
}

interface UseGameStateOptions {
  /** 초기 플레이어 목록 */
  initialPlayers: Array<{ id: string; nickname: string }>
  /** 내 플레이어 ID */
  myPlayerId: string
}

export function useGameState(options: UseGameStateOptions) {
  const { initialPlayers, myPlayerId } = options

  const [gameStatus, setGameStatus] = useState<GameStatus>('LOBBY')
  const [players, setPlayers] = useState<Player[]>(
    initialPlayers.map((p) => ({ ...p, status: 'ALIVE' as PlayerStatus }))
  )
  const [winner, setWinner] = useState<Player | null>(null)

  // initialPlayers 변경 시 플레이어 리스트 업데이트
  useEffect(() => {
    setPlayers(initialPlayers.map((p) => ({ ...p, status: 'ALIVE' as PlayerStatus })))
  }, [initialPlayers])

  // Alive 플레이어만 필터링
  const alivePlayers = players.filter((p) => p.status === 'ALIVE')

  // 내 플레이어
  const myPlayer = players.find((p) => p.id === myPlayerId)

  // 내가 Alive인지
  const isMyPlayerAlive = myPlayer?.status === 'ALIVE'

  // 현재 플레이어 수 (N)
  const playerCount = alivePlayers.length

  // 내 플레이어의 Side 인덱스 (Alive 리스트 내에서)
  const myPlayerIndex = alivePlayers.findIndex((p) => p.id === myPlayerId)

  /**
   * 게임 시작
   */
  const startGame = useCallback(() => {
    setGameStatus('COUNTDOWN')
    // 카운트다운 후 PLAYING으로 전환 (별도 타이머 필요)
    setTimeout(() => {
      setGameStatus('PLAYING')
    }, 3000)
  }, [])

  /**
   * 플레이어 OUT 처리
   */
  const handlePlayerOut = useCallback(
    (sideIndex: number) => {
      if (gameStatus !== 'PLAYING') return

      const outPlayer = alivePlayers[sideIndex]
      if (!outPlayer) return

      console.log(`[GameState] Player ${outPlayer.nickname} is OUT!`)

      // OUT 처리
      setPlayers((prev) => {
        const outOrder = prev.filter((p) => p.status === 'OUT').length + 1

        return prev.map((p) =>
          p.id === outPlayer.id
            ? { ...p, status: 'OUT' as PlayerStatus, outOrder }
            : p
        )
      })

      // 승자 판정 (1명 남으면)
      const remainingAlive = alivePlayers.filter((p) => p.id !== outPlayer.id)

      if (remainingAlive.length === 1) {
        const winnerPlayer = remainingAlive[0]
        console.log(`[GameState] Winner: ${winnerPlayer.nickname}`)

        setWinner(winnerPlayer)
        setGameStatus('FINISHED')
      }
    },
    [alivePlayers, gameStatus]
  )

  /**
   * 게임 재시작
   */
  const restartGame = useCallback(() => {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        status: 'ALIVE' as PlayerStatus,
        outOrder: undefined,
      }))
    )
    setWinner(null)
    setGameStatus('LOBBY')
  }, [])

  /**
   * 플레이어의 현재 Side 인덱스 가져오기
   *
   * Alive 플레이어 리스트에서의 인덱스
   */
  const getPlayerSideIndex = useCallback(
    (playerId: string): number => {
      return alivePlayers.findIndex((p) => p.id === playerId)
    },
    [alivePlayers]
  )

  return {
    // 상태
    gameStatus,
    players,
    alivePlayers,
    myPlayer,
    isMyPlayerAlive,
    playerCount,
    myPlayerIndex,
    winner,

    // 액션
    startGame,
    handlePlayerOut,
    restartGame,
    getPlayerSideIndex,
  }
}
