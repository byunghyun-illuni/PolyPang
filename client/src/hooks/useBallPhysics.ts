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
import { GAME_CONSTANTS, getPaddleRatios } from '@/utils/constants'
import {
  getSideCenter,
  getSideNormal,
  getSideTangent,
  getSideLength,
  getSideAngle,
} from '@/physics/geometry'
import { add, multiply } from '@/physics/vector'
import {
  checkBallPaddleCollision,
  isBallOutOfArena,
  isBallPassingSide,
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
  /** 게임 일시정지 여부 */
  paused?: boolean
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
    paused = false,
  } = options

  const [position, setPosition] = useState<Vector2D>(initialPosition)
  const [trail, setTrail] = useState<Vector2D[]>([])
  const [hitEffectActive, setHitEffectActive] = useState(false)

  const velocityRef = useRef<Vector2D>(initialVelocity)
  const lastHitTimeRef = useRef<number>(0)
  const initialVelocityRef = useRef(initialVelocity)

  // 초기 속도 저장
  useEffect(() => {
    initialVelocityRef.current = initialVelocity
  }, [initialVelocity])

  // 공 반지름
  const ballRadius = arenaRadius * GAME_CONSTANTS.BALL_RADIUS_RATIO

  // N-adaptive 패들 비율
  const { alpha, beta, renderN } = getPaddleRatios(playerCount)

  // N=2일 때는 Side 0(상단), Side 2(하단)만 플레이어 배치
  const playerSideIndices =
    playerCount === 2 ? [0, 2] : Array.from({ length: playerCount }, (_, i) => i)

  // Side 길이 (renderN 기준)
  const sideLength = getSideLength(renderN, arenaRadius)
  const paddleLength = sideLength * alpha
  const paddleMoveRange = sideLength * beta

  const checkCollisions = useCallback(
    (currentPos: Vector2D, currentVel: Vector2D) => {
      let newVelocity = currentVel
      let newPosition = currentPos
      let collisionDetected = false

      // 1. 패들 충돌 체크 (OUT 판정 전에 먼저!)
      for (let i = 0; i < paddles.length; i++) {
        const paddle = paddles[i]
        const { position: paddlePos } = paddle

        // 실제 Side 인덱스 (N=2일 때 0→0, 1→2)
        const actualSideIndex = playerSideIndices[i]

        // 패들 중심 좌표 (renderN 기준)
        const sideCenter = getSideCenter(actualSideIndex, renderN, arenaRadius)
        const tangent = getSideTangent(actualSideIndex, renderN)
        const offset = (paddlePos * paddleMoveRange) / 2
        const paddleCenter = add(sideCenter, multiply(tangent, offset))

        // 🔑 패들 두께를 고려한 충돌 체크
        // 패들 두께 = ballRadius * 3 (충분히 넓게)
        const paddleThickness = ballRadius * 3

        const collision = checkBallPaddleCollision(
          currentPos,
          ballRadius + paddleThickness, // 패들 두께만큼 확장된 반지름
          paddleCenter,
          tangent,
          paddleLength
        )

        if (collision.collided) {
          // HIT!
          const normal = getSideNormal(actualSideIndex, renderN)

          // 속도 반사 및 증가
          newVelocity = reflectWithSpeedBoost(
            currentVel,
            normal,
            GAME_CONSTANTS.BALL_SPEED_INCREMENT
          )

          // 🔑 중요: 공을 Side 위치 기준으로 밀어냄 (패들 관통 방지)
          // Side 중심에서 Arena 안쪽으로 ballRadius + 여유 공간만큼 떨어진 위치
          const pushDistance = ballRadius + 5
          newPosition = add(sideCenter, multiply(normal, -pushDistance))

          collisionDetected = true
          onPaddleHit?.(i) // 플레이어 인덱스 전달 (0 or 1)

          // HIT 이펙트 활성화
          setHitEffectActive(true)
          lastHitTimeRef.current = Date.now()

          console.log(`[Ball] HIT on Side ${actualSideIndex} (Player ${i}), speed: ${Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2).toFixed(1)}`)

          break
        }
      }

      // 2. N=2 모드: 벽(Side 1, 3) 반사 처리
      if (!collisionDetected && playerCount === 2) {
        // 내접원 반지름
        const inRadius = arenaRadius * Math.cos(Math.PI / renderN)

        if (isBallOutOfArena(newPosition, inRadius)) {
          const anglePerSide = 360 / renderN

          // Side 1 (오른쪽) 또는 Side 3 (왼쪽) 체크 - 벽으로만 작동
          for (let sideIdx = 1; sideIdx <= 3; sideIdx += 2) {
            // Side 1, 3만 체크
            const sideAngle = getSideAngle(sideIdx, renderN)

            if (isBallPassingSide(newPosition, sideAngle, anglePerSide)) {
              // 벽 반사 (입사각 = 반사각)
              const normal = getSideNormal(sideIdx, renderN)
              const sideCenter = getSideCenter(sideIdx, renderN, arenaRadius)

              // 반사 (속도 증가 없음)
              const dotProduct = currentVel.x * normal.x + currentVel.y * normal.y
              newVelocity = {
                x: currentVel.x - 2 * dotProduct * normal.x,
                y: currentVel.y - 2 * dotProduct * normal.y,
              }

              // 공을 벽에서 밀어냄
              const pushDistance = ballRadius + 5
              newPosition = add(sideCenter, multiply(normal, -pushDistance))

              console.log(`[Ball] 벽 반사 (Side ${sideIdx})`)
              collisionDetected = true
              break
            }
          }

          // 패들 있는 Side (0, 2)에 닿았는데 패들 충돌 안했으면 → 즉시 OUT
          if (!collisionDetected) {
            for (let i = 0; i < playerCount; i++) {
              const actualSideIndex = playerSideIndices[i] // 0 or 2
              const sideAngle = getSideAngle(actualSideIndex, renderN)

              if (isBallPassingSide(newPosition, sideAngle, anglePerSide)) {
                // 패들 못 막음 → OUT!
                console.log(`[Ball] OUT! Side ${actualSideIndex} (Player ${i}) - 패들 미스`)
                onPlayerOut?.(i)

                velocityRef.current = { x: 0, y: 0 }
                return { velocity: { x: 0, y: 0 }, position: newPosition }
              }
            }
          }
        }
      }

      // 3. N≥3 모드: 기존 OUT 판정
      if (!collisionDetected && playerCount >= 3) {
        const inRadius = arenaRadius * Math.cos(Math.PI / renderN)

        if (isBallOutOfArena(newPosition, inRadius)) {
          const anglePerSide = 360 / renderN

          for (let i = 0; i < playerCount; i++) {
            const actualSideIndex = playerSideIndices[i]
            const sideAngle = getSideAngle(actualSideIndex, renderN)

            if (isBallPassingSide(newPosition, sideAngle, anglePerSide)) {
              console.log(`[Ball] OUT! Side ${actualSideIndex} (Player ${i}) passed`)
              onPlayerOut?.(i)

              velocityRef.current = { x: 0, y: 0 }
              return { velocity: { x: 0, y: 0 }, position: newPosition }
            }
          }
        }
      }

      // 4. Arena 완전히 벗어남 (안전망) - 게임 멈춤
      if (isBallOutOfArena(newPosition, arenaRadius * 1.5)) {
        console.log('[Ball] 안전망: Arena 완전히 벗어남, 게임 멈춤')
        velocityRef.current = { x: 0, y: 0 }
        return { velocity: { x: 0, y: 0 }, position: newPosition }
      }

      return { velocity: newVelocity, position: newPosition }
    },
    [
      paddles,
      playerCount,
      arenaRadius,
      ballRadius,
      sideLength,
      paddleLength,
      paddleMoveRange,
      playerSideIndices,
      renderN,
      onPlayerOut,
      onPaddleHit,
    ]
  )

  useEffect(() => {
    // 일시정지 상태면 업데이트 안 함
    if (paused) return

    let animationFrameId: number
    const positionRef = { x: position.x, y: position.y }

    const update = () => {
      const deltaTime = 1 / 60 // 60fps

      // 위치 업데이트
      const newPos = {
        x: positionRef.x + velocityRef.current.x * deltaTime,
        y: positionRef.y + velocityRef.current.y * deltaTime,
      }

      // 충돌 체크 및 반사
      const result = checkCollisions(newPos, velocityRef.current)
      if (result) {
        velocityRef.current = result.velocity
        positionRef.x = result.position.x
        positionRef.y = result.position.y
        setPosition(result.position)
      } else {
        positionRef.x = newPos.x
        positionRef.y = newPos.y
        setPosition(newPos)
      }

      // 트레일 업데이트
      setTrail((prev) => [...prev, { x: positionRef.x, y: positionRef.y }].slice(-15))

      // HIT 이펙트 해제 (0.3초 후)
      if (Date.now() - lastHitTimeRef.current > 300) {
        setHitEffectActive(false)
      }

      animationFrameId = requestAnimationFrame(update)
    }

    animationFrameId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [checkCollisions, paused])

  // 리셋 함수
  const reset = useCallback(() => {
    setPosition(initialPosition)
    setTrail([])
    setHitEffectActive(false)
    velocityRef.current = initialVelocityRef.current
    lastHitTimeRef.current = 0
  }, [initialPosition])

  return {
    position,
    velocity: velocityRef.current,
    trail,
    hitEffectActive,
    ballRadius,
    reset,
  }
}
