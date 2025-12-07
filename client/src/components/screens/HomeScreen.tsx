/**
 * S01: 홈 / 방 선택 화면
 *
 * 기능:
 * - 방 만들기
 * - 참가코드로 입장
 *
 * 출처: docs/planning/02_PRD_화면기획.md
 */

import { useState } from 'react'
// import { useNavigate } from 'react-router-dom'

export default function HomeScreen() {
  // const navigate = useNavigate() // TODO: 라우팅 구현 시 활성화
  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요 (1~10자)')
      return
    }

    setIsLoading(true)
    // TODO: Socket 연결 및 방 생성
    // socket.emit('create_room', { nickname }, (response) => {
    //   if (response.success) {
    //     navigate(`/lobby/${response.roomCode}`)
    //   }
    // })
    setTimeout(() => {
      setIsLoading(false)
      console.log('방 만들기:', nickname)
      // navigate('/lobby/ABC123') // 임시
    }, 500)
  }

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      alert('참가코드를 입력해주세요 (6자리)')
      return
    }
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요 (1~10자)')
      return
    }

    setIsLoading(true)
    // TODO: Socket 연결 및 방 참가
    // socket.emit('join_room', { roomCode: roomCode.toUpperCase(), nickname }, (response) => {
    //   if (response.success) {
    //     navigate(`/lobby/${roomCode.toUpperCase()}`)
    //   } else {
    //     alert(response.error)
    //   }
    // })
    setTimeout(() => {
      setIsLoading(false)
      console.log('방 참가:', roomCode.toUpperCase(), nickname)
    }, 500)
  }

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 자동 대문자 변환 + 6자리 제한
    const value = e.target.value.toUpperCase().slice(0, 6)
    setRoomCode(value)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 bg-gradient-to-b from-purple-50 to-blue-50">
      {/* 로고 */}
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
          PolyPang
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          친구들이랑 팡! 한판 하자
        </p>
      </div>

      {/* 닉네임 입력 (공통) */}
      <div className="w-full max-w-sm mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          닉네임
        </label>
        <input
          type="text"
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="닉네임 입력 (1~10자)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 10))}
          maxLength={10}
          disabled={isLoading}
        />
      </div>

      {/* 방 만들기 버튼 */}
      <button
        className="w-full max-w-sm px-6 py-4 mb-6 text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        onClick={handleCreateRoom}
        disabled={isLoading || !nickname.trim()}
      >
        {isLoading ? '생성 중...' : '방 만들기'}
      </button>

      {/* 구분선 */}
      <div className="flex items-center w-full max-w-sm mb-6">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="px-3 text-sm text-gray-500">또는</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* 참가코드 입력 */}
      <div className="w-full max-w-sm mb-3">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          참가코드
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-3 text-lg font-mono tracking-widest text-center uppercase border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="ABC123"
            value={roomCode}
            onChange={handleRoomCodeChange}
            maxLength={6}
            disabled={isLoading}
          />
          <button
            className="px-6 py-3 text-lg font-bold text-purple-600 border-2 border-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={handleJoinRoom}
            disabled={
              isLoading || !roomCode.trim() || !nickname.trim() || roomCode.length < 6
            }
          >
            입장
          </button>
        </div>
      </div>

      {/* 버전 정보 */}
      <div className="absolute bottom-4 text-xs text-gray-400 space-y-1">
        <div>v0.1.0 MVP • Vite + React + TypeScript + PixiJS</div>
        <div>
          <a
            href="/arena-test"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            🎮 Arena 테스트 화면 →
          </a>
        </div>
      </div>
    </div>
  )
}
