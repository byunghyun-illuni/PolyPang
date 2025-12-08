/**
 * Socket.io 연결 관리 Hook
 */

import { useEffect, useState, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { initSocket, getSocket, disconnectSocket } from '@/services/socket'

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  connect: () => void
  disconnect: () => void
}

export function useSocket(): UseSocketReturn {
  // 기존 소켓이 있으면 초기값으로 사용 (페이지 이동 시 소켓 유지)
  const [socket, setSocket] = useState<Socket | null>(() => getSocket())
  const [isConnected, setIsConnected] = useState(() => getSocket()?.connected ?? false)

  const connect = useCallback(() => {
    const s = initSocket()
    setSocket(s)
  }, [])

  const disconnect = useCallback(() => {
    disconnectSocket()
    setSocket(null)
    setIsConnected(false)
  }, [])

  useEffect(() => {
    const s = getSocket() || initSocket()
    setSocket(s)

    const handleConnect = () => {
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    s.on('connect', handleConnect)
    s.on('disconnect', handleDisconnect)

    // 이미 연결된 경우
    if (s.connected) {
      setIsConnected(true)
    }

    return () => {
      s.off('connect', handleConnect)
      s.off('disconnect', handleDisconnect)
    }
  }, [])

  return { socket, isConnected, connect, disconnect }
}
