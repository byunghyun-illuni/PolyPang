/**
 * Ball 물리 엔진 Hook
 *
 * 역할:
 * - 공 위치/속도 관리
 * - Side 벽 반사
 * - 패들 충돌 및 반사
 * - OUT 판정
 *
 * 출처: docs/planning/01_PRD_게임기획.md
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Vector2D } from '@/types'
import { GAME_CONSTANTS } from '@/utils/constants'
import {
  getSideCenter,
  getSideNormal,
  getSideTangent,
  getSideLength,
  getSideVertices,
} from '@/physics/geometry'
import { add, multiply } from '@/physics/vector'
import {
  checkBallLineCollision,
  checkBallPaddleCollision,
  isBallOutOfArena,
} from '@/physics/collision'
import { reflectWithSpeedBoost } from '@/physics/reflection'

interface PaddleInfo {
  sideIndex: number
  position: number // -1 ~ 1
}

interface UseBallPhysicsOptions {
  /** 플레이어 수 (N) */
  playerCount: number
  /** Arena 반지름 */
  arenaRadius: number
  /** 패들 정보 배열 */
  paddles: PaddleInfo[]
  /** 초기 공 위치 */
  initialPosition?: Vector2D
  /** 초기 공 속도 */
  initialVelocity?: Vector2D
  /** OUT 콜백 */
  onPlayerOut?: (sideIndex: number) => void
  /** HIT 콜백 */
  onPaddleHit?: (sideIndex: number) => void
}

export function useBallPhysics(options: UseBallPhysicsOptions) {
  const {
    playerCount,
    arenaRadius,
    paddles,
    initialPosition = { x: 0, y: 0 },
    initialVelocity = { x: 50, y: 50 },
    onPlayerOut,
    onPaddleHit,
  } = options

  const [position, setPosition] = useState<Vector2D>(initialPosition)
  const [trail, setTrail] = useState<Vector2D[]>([])
  const [hitEffectActive, setHitEffectActive] = useState(false)

  const velocityRef = useRef<Vector2D>(initialVelocity)
  const lastHitTimeRef = useRef<number>(0)

  // 공 반지름
  const ballRadius = arenaRadius * GAME_CONSTANTS.BALL_RADIUS_RATIO

  // Side 길이
  const sideLength = getSideLength(playerCount, arenaRadius)
  const paddleLength = sideLength * GAME_CONSTANTS.PADDLE_LENGTH_RATIO
  const paddleMoveRange = sideLength * GAME_CONSTANTS.PADDLE_MOVE_RANGE

  const checkCollisions = useCallback(
    (currentPos: Vector2D, currentVel: Vector2D) => {
      let newVelocity = currentVel
      let collisionDetected = false

      // 1. 패들 충돌 체크
      for (const paddle of paddles) {
        const { sideIndex, position: paddlePos } = paddle

        // 패들 중심 좌표
        const sideCenter = getSideCenter(sideIndex, playerCount, arenaRadius)
        const tangent = getSideTangent(sideIndex, playerCount)
        const offset = (paddlePos * paddleMoveRange) / 2
        const paddleCenter = add(sideCenter, multiply(tangent, offset))

        // 충돌 체크
        const collision = checkBallPaddleCollision(
          currentPos,
          ballRadius,
          paddleCenter,
          tangent,
          paddleLength
        )

        if (collision.collided) {
          // HIT!
          const normal = getSideNormal(sideIndex, playerCount)
          newVelocity = reflectWithSpeedBoost(
            currentVel,
            normal,
            GAME_CONSTANTS.BALL_SPEED_INCREMENT
          )

          collisionDetected = true
          onPaddleHit?.(sideIndex)

          // HIT 이펙트 활성화
          setHitEffectActive(true)
          lastHitTimeRef.current = Date.now()

          break
        }
      }

      // 2. Side 벽 충돌 체크 (패들에 안 맞은 경우만)
      if (!collisionDetected) {
        for (let i = 0; i < playerCount; i++) {
          const [v1, v2] = getSideVertices(i, playerCount, arenaRadius)

          const collision = checkBallLineCollision(currentPos, ballRadius, {
            start: v1,
            end: v2,
          })

          if (collision.collided) {
            // 패들 충돌 없이 Side에 닿았다 = 패들을 통과한 것 = OUT!
            // 어느 Side인지 판정
            onPlayerOut?.(i)

            // 공을 중앙으로 리셋 (임시)
            setPosition({ x: 0, y: 0 })
            velocityRef.current = {
              x: (Math.random() - 0.5) * 100,
              y: (Math.random() - 0.5) * 100
            }
            return
          }
        }
      }

      // 3. Arena 완전히 벗어남 (안전망)
      if (isBallOutOfArena(currentPos, arenaRadius * 1.5)) {
        // 공을 중앙으로 리셋
        setPosition({ x: 0, y: 0 })
        velocityRef.current = {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100
        }
      }

      return newVelocity
    },
    [
      paddles,
      playerCount,
      arenaRadius,
      ballRadius,
      sideLength,
      paddleLength,
      paddleMoveRange,
      onPlayerOut,
      onPaddleHit,
    ]
  )

  useEffect(() => {
    let animationFrameId: number

    const update = () => {
      const deltaTime = 1 / 60 // 60fps

      // 위치 업데이트
      const newPos = {
        x: position.x + velocityRef.current.x * deltaTime,
        y: position.y + velocityRef.current.y * deltaTime,
      }

      // 충돌 체크 및 반사
      const newVel = checkCollisions(newPos, velocityRef.current)
      if (newVel) {
        velocityRef.current = newVel
      }

      setPosition(newPos)

      // 트레일 업데이트
      setTrail((prev) => [...prev, newPos].slice(-15))

      // HIT 이펙트 해제 (0.3초 후)
      if (hitEffectActive && Date.now() - lastHitTimeRef.current > 300) {
        setHitEffectActive(false)
      }

      animationFrameId = requestAnimationFrame(update)
    }

    animationFrameId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [position, checkCollisions, hitEffectActive])

  return {
    position,
    velocity: velocityRef.current,
    trail,
    hitEffectActive,
    ballRadius,
  }
}
