/**
 * 패들 물리 Hook
 *
 * 역할:
 * - 패들 위치/속도 관리
 * - 가속/감속 로직
 * - 이동 범위 제한 (-1 ~ 1)
 *
 * 물리 스펙:
 * - 입력 유지 시 가속도로 속도 증가
 * - 최대 속도 제한
 * - 입력 없음 시 감속 (마찰)
 * - 범위: -1 (왼쪽 끝) ~ 1 (오른쪽 끝)
 *
 * 출처: docs/planning/01_PRD_게임기획.md
 */

import { useEffect, useRef, useState } from 'react'
import type { InputDirection } from './useArenaInput'
import { GAME_CONSTANTS } from '@/utils/constants'

interface UsePaddlePhysicsOptions {
  /** 입력 방향 */
  direction: InputDirection
  /** 초기 위치 (-1 ~ 1) */
  initialPosition?: number
}

export function usePaddlePhysics(options: UsePaddlePhysicsOptions) {
  const { direction, initialPosition = 0 } = options

  const [position, setPosition] = useState(initialPosition)
  const velocityRef = useRef(0) // 현재 속도

  useEffect(() => {
    let animationFrameId: number

    const update = () => {
      const deltaTime = 1 / 60 // 60fps 가정

      // 가속도 계산
      let acceleration = 0

      if (direction === 'LEFT') {
        acceleration = -GAME_CONSTANTS.PADDLE_ACCELERATION
      } else if (direction === 'RIGHT') {
        acceleration = GAME_CONSTANTS.PADDLE_ACCELERATION
      } else {
        // 입력 없음: 감속 (마찰)
        acceleration = 0
        velocityRef.current *= GAME_CONSTANTS.PADDLE_DECELERATION
      }

      // 속도 업데이트
      velocityRef.current += acceleration * deltaTime

      // 최대 속도 제한
      const maxSpeed = GAME_CONSTANTS.PADDLE_MAX_SPEED
      velocityRef.current = Math.max(
        -maxSpeed,
        Math.min(maxSpeed, velocityRef.current)
      )

      // 위치 업데이트
      setPosition((prev) => {
        const newPosition = prev + velocityRef.current * deltaTime

        // 범위 제한 (-1 ~ 1)
        const clamped = Math.max(-1, Math.min(1, newPosition))

        // 벽에 닿으면 속도 0
        if (clamped !== newPosition) {
          velocityRef.current = 0
        }

        return clamped
      })

      animationFrameId = requestAnimationFrame(update)
    }

    animationFrameId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [direction])

  return {
    position,
    velocity: velocityRef.current,
  }
}
