/**
 * Socket.io 클라이언트 서비스
 */

import { io, Socket } from 'socket.io-client'

// 서버 URL 결정: 환경변수 > 현재 호스트 (프로덕션) > localhost (개발)
function getServerUrl(): string {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL
  }
  // localhost가 아니면 같은 origin 사용 (배포 환경)
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return window.location.origin
  }
  return 'http://localhost:3001'
}

const SERVER_URL = getServerUrl()

let socket: Socket | null = null

/**
 * Socket 연결 초기화
 */
export function initSocket(): Socket {
  if (socket?.connected) {
    return socket
  }

  socket = io(SERVER_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

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
export function getSocket(): Socket | null {
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

export default { initSocket, getSocket, disconnectSocket }
