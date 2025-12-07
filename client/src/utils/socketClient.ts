/**
 * Socket.io 클라이언트 래퍼
 */

import { io, Socket } from 'socket.io-client'
import { ENV } from './constants'

let socket: Socket | null = null

/**
 * Socket 연결 초기화
 */
export function initSocket(): Socket {
  if (socket && socket.connected) {
    return socket
  }

  socket = io(ENV.SERVER_URL, {
    path: ENV.SOCKET_PATH,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  // 기본 연결 이벤트 로깅
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error)
  })

  return socket
}

/**
 * Socket 인스턴스 가져오기
 */
export function getSocket(): Socket {
  if (!socket) {
    return initSocket()
  }
  return socket
}

/**
 * Socket 연결 해제
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
