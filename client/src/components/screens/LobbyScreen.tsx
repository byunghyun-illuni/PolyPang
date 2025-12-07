/**
 * 로비 화면 - 방 생성/참가
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '@/hooks/useSocket'
import { useGameStore } from '@/stores/gameStore'
import type { Room } from '@/types'

export default function LobbyScreen() {
  const navigate = useNavigate()
  const { socket, isConnected } = useSocket()
  const { setMyInfo, setRoom } = useGameStore()

  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Socket 이벤트 리스너
  useEffect(() => {
    if (!socket) return

    const handleRoomCreated = (data: { room: Room; userId: string }) => {
      console.log('[Lobby] Room created:', data)
      setMyInfo(data.userId, nickname)
      setRoom(data.room)
      setIsLoading(false)
      navigate(`/room/${data.room.roomCode}`)
    }

    const handleRoomJoined = (data: { room: Room; userId: string }) => {
      console.log('[Lobby] Room joined:', data)
      setMyInfo(data.userId, nickname)
      setRoom(data.room)
      setIsLoading(false)
      navigate(`/room/${data.room.roomCode}`)
    }

    const handleError = (data: { code: string; message: string }) => {
      console.error('[Lobby] Error:', data)
      setError(data.message)
      setIsLoading(false)
    }

    socket.on('room_created', handleRoomCreated)
    socket.on('room_joined', handleRoomJoined)
    socket.on('error', handleError)

    return () => {
      socket.off('room_created', handleRoomCreated)
      socket.off('room_joined', handleRoomJoined)
      socket.off('error', handleError)
    }
  }, [socket, nickname, navigate, setMyInfo, setRoom])

  const handleCreateRoom = () => {
    if (!socket || !nickname.trim()) {
      setError('닉네임을 입력해주세요')
      return
    }
    setError(null)
    setIsLoading(true)
    socket.emit('create_room', { nickname: nickname.trim(), maxPlayers: 8 })
  }

  const handleJoinRoom = () => {
    if (!socket || !nickname.trim()) {
      setError('닉네임을 입력해주세요')
      return
    }
    if (!roomCode.trim()) {
      setError('방 코드를 입력해주세요')
      return
    }
    setError(null)
    setIsLoading(true)
    socket.emit('join_room', { nickname: nickname.trim(), roomCode: roomCode.toUpperCase().trim() })
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-4">
      {/* 타이틀 */}
      <h1 className="text-4xl font-bold mb-2">PolyPang</h1>
      <p className="text-gray-400 mb-8">멀티플레이어 핀볼 서바이벌</p>

      {/* 연결 상태 */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-400">
          {isConnected ? '서버 연결됨' : '연결 중...'}
        </span>
      </div>

      {/* 닉네임 입력 */}
      <div className="w-full max-w-xs mb-6">
        <input
          type="text"
          placeholder="닉네임 (1-10자)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 10))}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:border-yellow-400"
          disabled={isLoading}
        />
      </div>

      {/* 방 생성 버튼 */}
      <button
        onClick={handleCreateRoom}
        disabled={!isConnected || isLoading || !nickname.trim()}
        className="w-full max-w-xs py-3 mb-4 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:bg-gray-600 disabled:text-gray-400 transition-colors"
      >
        {isLoading ? '처리 중...' : '방 만들기'}
      </button>

      {/* 구분선 */}
      <div className="flex items-center w-full max-w-xs mb-4">
        <div className="flex-1 border-t border-gray-700" />
        <span className="px-4 text-gray-500 text-sm">또는</span>
        <div className="flex-1 border-t border-gray-700" />
      </div>

      {/* 방 코드 입력 */}
      <div className="w-full max-w-xs mb-4">
        <input
          type="text"
          placeholder="방 코드 입력 (6자리)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center tracking-widest font-mono focus:outline-none focus:border-yellow-400"
          disabled={isLoading}
        />
      </div>

      {/* 방 참가 버튼 */}
      <button
        onClick={handleJoinRoom}
        disabled={!isConnected || isLoading || !nickname.trim() || !roomCode.trim()}
        className="w-full max-w-xs py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 transition-colors"
      >
        참가하기
      </button>

      {/* 에러 메시지 */}
      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}

      {/* 솔로 플레이 링크 */}
      <button
        onClick={() => navigate('/arena-test')}
        className="mt-8 text-gray-500 text-sm hover:text-gray-300 underline"
      >
        혼자 연습하기
      </button>
    </div>
  )
}
