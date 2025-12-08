/**
 * OUT 오버레이 컴포넌트
 *
 * 역할:
 * - OUT 발생 시 화면에 크게 표시
 * - 누가 OUT됐는지 명확히 알려줌
 * - 빨간색 플래시 효과
 *
 * 출처: UX 개선 (어디서 OUT됐는지 명확히)
 */

import { useEffect, useState } from 'react'
import { isBot } from '@/utils/constants'

interface OutOverlayProps {
  /** 표시 여부 */
  visible: boolean
  /** OUT된 플레이어 닉네임 */
  playerName?: string
  /** OUT된 플레이어 ID */
  playerId?: string
  /** OUT된 Side 인덱스 */
  sideIndex?: number
  /** 플레이어 색상 */
  playerColor?: string
}

export default function OutOverlay({
  visible,
  playerName,
  playerId,
  sideIndex,
  playerColor = '#ff0000',
}: OutOverlayProps) {
  const [pulsePhase, setPulsePhase] = useState(0)

  // 펄스 애니메이션
  useEffect(() => {
    if (!visible) return

    const interval = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 100)
    }, 50)

    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  // 봇인지 확인
  const isBotPlayer = playerId ? isBot(playerId) : false
  const displayName = isBotPlayer ? 'BOT' : playerName || '???'

  // 펄스 효과 (깜빡임)
  const pulseOpacity = 0.7 + Math.sin((pulsePhase / 100) * Math.PI * 4) * 0.3

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* 빨간색 가장자리 비네팅 효과 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(255, 0, 0, ${pulseOpacity * 0.4}) 100%)`,
        }}
      />

      {/* OUT 메시지 */}
      <div className="flex flex-col items-center animate-bounce">
        {/* OUT 텍스트 */}
        <div
          className="text-5xl font-black tracking-wider"
          style={{
            color: '#ff3333',
            textShadow: `
              0 0 20px rgba(255, 0, 0, ${pulseOpacity}),
              0 0 40px rgba(255, 0, 0, ${pulseOpacity * 0.7}),
              0 0 60px rgba(255, 0, 0, ${pulseOpacity * 0.5}),
              2px 2px 0 #000,
              -2px -2px 0 #000,
              2px -2px 0 #000,
              -2px 2px 0 #000
            `,
          }}
        >
          OUT!
        </div>

        {/* 플레이어 이름 */}
        <div
          className="mt-2 text-2xl font-bold"
          style={{
            color: isBotPlayer ? '#6b7280' : playerColor,
            textShadow: `
              0 0 10px ${isBotPlayer ? 'rgba(107, 114, 128, 0.8)' : playerColor}80,
              1px 1px 0 #000,
              -1px -1px 0 #000,
              1px -1px 0 #000,
              -1px 1px 0 #000
            `,
          }}
        >
          {displayName}
        </div>

        {/* Side 번호 (디버그용, 작게) */}
        {sideIndex !== undefined && (
          <div className="mt-1 text-xs text-gray-400">Side {sideIndex + 1}</div>
        )}
      </div>
    </div>
  )
}
