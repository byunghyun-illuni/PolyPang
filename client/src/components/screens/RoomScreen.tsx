/**
 * 대기실 화면 - 플레이어 목록, Ready, 게임 시작
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocket } from '@/hooks/useSocket'
import { useGameStore } from '@/stores/gameStore'
import type { Room, Player, GameState } from '@/types'

export default function RoomScreen() {
  const navigate = useNavigate()
  const { roomCode: paramRoomCode } = useParams<{ roomCode: string }>()
  const { socket } = useSocket()
  const { room, myUserId, setRoom, updatePlayer, setGameState } = useGameStore()

  const [countdown, setCountdown] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const myPlayer = room?.players.find((p) => p.userId === myUserId)
  const isHost = myPlayer?.isHost ?? false
  const allReady = room?.players.every((p) => p.isReady || p.isHost) ?? false
  const canStart = isHost && allReady && (room?.players.length ?? 0) >= 2

  // Socket 이벤트 리스너
  useEffect(() => {
    if (!socket) return

    const handlePlayerJoined = (data: { player: Player; room: Room }) => {
      console.log('[Room] Player joined:', data.player.nickname)
      setRoom(data.room)
    }

    const handlePlayerLeft = (data: { userId: string; room: Room }) => {
      console.log('[Room] Player left:', data.userId)
      setRoom(data.room)
    }

    const handlePlayerReadyChanged = (data: { userId: string; isReady: boolean }) => {
      console.log('[Room] Ready changed:', data.userId, data.isReady)
      updatePlayer(data.userId, { isReady: data.isReady })
    }

    const handleHostChanged = (data: { newHostId: string }) => {
      console.log('[Room] Host changed:', data.newHostId)
      if (room) {
        const players = room.players.map((p) => ({
          ...p,
          isHost: p.userId === data.newHostId,
        }))
        setRoom({ ...room, players })
      }
    }

    const handleGameCountdown = (data: { count: number }) => {
      console.log('[Room] Countdown:', data.count)
      setCountdown(data.count)
    }

    const handleGameStarted = (data: { gameState: GameState }) => {
      console.log('[Room] Game started!')
      setGameState(data.gameState)
      navigate(`/game/${paramRoomCode}`)
    }

    const handleError = (data: { code: string; message: string }) => {
      console.error('[Room] Error:', data)
      setError(data.message)
    }

    socket.on('player_joined', handlePlayerJoined)
    socket.on('player_left', handlePlayerLeft)
    socket.on('player_ready_changed', handlePlayerReadyChanged)
    socket.on('host_changed', handleHostChanged)
    socket.on('game_countdown', handleGameCountdown)
    socket.on('game_started', handleGameStarted)
    socket.on('error', handleError)

    return () => {
      socket.off('player_joined', handlePlayerJoined)
      socket.off('player_left', handlePlayerLeft)
      socket.off('player_ready_changed', handlePlayerReadyChanged)
      socket.off('host_changed', handleHostChanged)
      socket.off('game_countdown', handleGameCountdown)
      socket.off('game_started', handleGameStarted)
      socket.off('error', handleError)
    }
  }, [socket, room, paramRoomCode, navigate, setRoom, updatePlayer, setGameState])

  // 방이 없으면 로비로
  useEffect(() => {
    if (!room && !socket) {
      navigate('/')
    }
  }, [room, socket, navigate])

  const handleToggleReady = () => {
    if (!socket) return
    socket.emit('toggle_ready')
  }

  const handleStartGame = () => {
    if (!socket || !canStart) return
    socket.emit('start_game')
  }

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leave_room')
    }
    navigate('/')
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handleLeaveRoom} className="text-gray-400 hover:text-white">
          ← 나가기
        </button>
        <div className="text-center">
          <p className="text-sm text-gray-400">방 코드</p>
          <p className="text-2xl font-mono font-bold tracking-widest text-yellow-400">
            {room.roomCode}
          </p>
        </div>
        <div className="w-16" /> {/* 균형용 */}
      </div>

      {/* 카운트다운 오버레이 */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-8xl font-bold text-yellow-400 animate-pulse">
            {countdown === 0 ? 'GO!' : countdown}
          </div>
        </div>
      )}

      {/* 플레이어 목록 */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-sm text-gray-400 mb-2">
          플레이어 ({room.players.length}/{room.maxPlayers})
        </p>
        <div className="space-y-2">
          {room.players.map((player, index) => (
            <div
              key={player.userId}
              className={`flex items-center justify-between p-3 rounded-lg ${
                player.userId === myUserId ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* 플레이어 번호/색상 */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: player.color || '#666' }}
                >
                  {index + 1}
                </div>
                {/* 닉네임 */}
                <div>
                  <p className="font-medium">
                    {player.nickname}
                    {player.userId === myUserId && <span className="text-yellow-400 ml-1">(나)</span>}
                  </p>
                  {player.isHost && (
                    <p className="text-xs text-yellow-400">방장</p>
                  )}
                </div>
              </div>
              {/* Ready 상태 */}
              <div>
                {player.isHost ? (
                  <span className="text-yellow-400 text-sm">HOST</span>
                ) : player.isReady ? (
                  <span className="text-green-400 text-sm font-bold">READY</span>
                ) : (
                  <span className="text-gray-500 text-sm">대기 중</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="text-red-400 text-sm text-center mb-2">{error}</p>
      )}

      {/* 하단 버튼 */}
      <div className="mt-4">
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={!canStart}
            className="w-full py-4 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
          >
            {room.players.length < 2
              ? '최소 2명 필요'
              : !allReady
              ? '모두 Ready 대기 중...'
              : '게임 시작!'}
          </button>
        ) : (
          <button
            onClick={handleToggleReady}
            className={`w-full py-4 font-bold rounded-lg transition-colors ${
              myPlayer?.isReady
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-green-500 text-black hover:bg-green-400'
            }`}
          >
            {myPlayer?.isReady ? 'Ready 취소' : 'Ready!'}
          </button>
        )}
      </div>
    </div>
  )
}
