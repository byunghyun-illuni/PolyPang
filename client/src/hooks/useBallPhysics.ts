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
} from '@/physics/geometry'
import { add, multiply, dot } from '@/physics/vector'
import {
  checkBallPaddleCollision,
  checkBallLineCollision,
  isBallOutOfArena,
} from '@/physics/collision'
import { getSideVertices } from '@/physics/geometry'
import { reflectWithPaddleAngle } from '@/physics/reflection'
import { magnitude, normalize, multiply as multiplyVec } from '@/physics/vector'

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
  const isFirstHitRef = useRef<boolean>(true) // 첫 HIT 여부 추적

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
        const normal = getSideNormal(actualSideIndex, renderN)
        const tangent = getSideTangent(actualSideIndex, renderN)
        const offset = (paddlePos * paddleMoveRange) / 2
        const paddleCenter = add(sideCenter, multiply(tangent, offset))

        // 공이 Side 방향으로 이동 중인지 체크 (안쪽→바깥쪽)
        const velocityTowardsSide = dot(currentVel, normal)
        if (velocityTowardsSide <= 0) {
          // Side에서 멀어지는 중이면 충돌 체크 스킵
          continue
        }

        // 패들과의 충돌 체크
        // 패들 두께(약 8px)를 고려해서 공 반지름에 추가
        const paddleThickness = 4 // 패들 두께의 절반
        const collision = checkBallPaddleCollision(
          currentPos,
          ballRadius + paddleThickness,
          paddleCenter,
          tangent,
          paddleLength
        )

        if (collision.collided) {
          // HIT!
          // 패들의 어느 부분을 맞췄는지 계산 (t: 0=시작점, 0.5=중앙, 1=끝점)
          // paddleOffset: -1(왼쪽 끝) ~ 0(중앙) ~ 1(오른쪽 끝)
          // 화면 기준 왼쪽/오른쪽과 일치하도록 부호 반전
          const paddleOffset = collision.t !== undefined ? -((collision.t - 0.5) * 2) : 0
          const deflectStrength = 0.7 // 꺾임 강도 (0~1)

          if (isFirstHitRef.current) {
            // 첫 HIT: 정상 속도로 점프 후 반사
            isFirstHitRef.current = false
            const currentSpeed = Math.sqrt(currentVel.x ** 2 + currentVel.y ** 2)
            const normalizedVel = {
              x: currentVel.x / currentSpeed,
              y: currentVel.y / currentSpeed,
            }
            // 정상 속도로 설정 후 반사
            const boostedVel = {
              x: normalizedVel.x * GAME_CONSTANTS.BALL_NORMAL_SPEED,
              y: normalizedVel.y * GAME_CONSTANTS.BALL_NORMAL_SPEED,
            }
            // 패들 위치에 따른 각도 조정 적용
            const reflected = reflectWithPaddleAngle(boostedVel, normal, paddleOffset, deflectStrength)
            newVelocity = reflected // 첫 HIT는 추가 가속 없음
          } else {
            // 이후 HIT: 패들 위치에 따른 각도 조정 + 가속
            const reflected = reflectWithPaddleAngle(currentVel, normal, paddleOffset, deflectStrength)
            // 속도 증가 적용
            const speed = magnitude(reflected) * GAME_CONSTANTS.BALL_SPEED_INCREMENT
            const dir = normalize(reflected)
            newVelocity = multiplyVec(dir, speed)
          }

          // 공을 패들에서 밀어냄 (관통 방지)
          const pushDistance = ballRadius + 2
          newPosition = add(currentPos, multiply(normal, -pushDistance))

          collisionDetected = true
          onPaddleHit?.(i)

          // HIT 이펙트 활성화
          setHitEffectActive(true)
          lastHitTimeRef.current = Date.now()

          console.log(`[Ball] HIT on Side ${actualSideIndex} (Player ${i}), offset: ${paddleOffset.toFixed(2)}, speed: ${Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2).toFixed(1)}`)

          break
        }
      }

      // 2. N=2 모드: 벽(Side 1, 3) 반사 처리 - 실제 벽 선분과의 충돌 감지
      if (!collisionDetected && playerCount === 2) {
        // Side 1 (오른쪽) 또는 Side 3 (왼쪽) 체크 - 벽으로만 작동
        for (const sideIdx of [1, 3]) {
          const normal = getSideNormal(sideIdx, renderN)

          // 공이 벽 쪽으로 이동 중인지 체크 (이미 반사되어 멀어지는 중이면 스킵)
          const velocityTowardsWall = dot(currentVel, normal)
          if (velocityTowardsWall <= 0) {
            continue
          }

          // 실제 벽 선분과의 충돌 체크
          const [v1, v2] = getSideVertices(sideIdx, renderN, arenaRadius)
          const wallCollision = checkBallLineCollision(newPosition, ballRadius, {
            start: v1,
            end: v2,
          })

          if (wallCollision.collided) {
            // 벽 반사 (입사각 = 반사각) + 5% 속도 증가
            const wallSpeedBoost = 1.05
            newVelocity = {
              x: (currentVel.x - 2 * velocityTowardsWall * normal.x) * wallSpeedBoost,
              y: (currentVel.y - 2 * velocityTowardsWall * normal.y) * wallSpeedBoost,
            }

            // 공을 벽에서 안쪽으로 밀어냄
            const pushDistance = ballRadius + 2
            newPosition = add(newPosition, multiply(normal, -pushDistance))

            console.log(`[Ball] 벽 반사 (Side ${sideIdx})`)
            collisionDetected = true
            break
          }
        }

        // 패들 있는 Side (0, 2)에 닿았는데 패들 충돌 안했으면 → 즉시 OUT
        // 실제 벽 선분과의 충돌로 체크
        if (!collisionDetected) {
          for (let i = 0; i < playerCount; i++) {
            const actualSideIndex = playerSideIndices[i] // 0 or 2
            const normal = getSideNormal(actualSideIndex, renderN)

            // 공이 이 Side 방향으로 이동 중인지 확인
            const velocityTowardsSide = dot(currentVel, normal)
            if (velocityTowardsSide <= 0) {
              continue
            }

            // 실제 Side 선분과의 충돌 체크
            const [v1, v2] = getSideVertices(actualSideIndex, renderN, arenaRadius)
            const sideCollision = checkBallLineCollision(newPosition, ballRadius, {
              start: v1,
              end: v2,
            })

            if (sideCollision.collided) {
              // 패들 못 막음 → OUT!
              console.log(`[Ball] OUT! Side ${actualSideIndex} (Player ${i}) - 패들 미스`)
              onPlayerOut?.(i)

              velocityRef.current = { x: 0, y: 0 }
              return { velocity: { x: 0, y: 0 }, position: newPosition }
            }
          }
        }
      }

      // 3. N≥3 모드: 실제 Side 선분과의 충돌로 OUT 판정
      if (!collisionDetected && playerCount >= 3) {
        for (let i = 0; i < playerCount; i++) {
          const actualSideIndex = playerSideIndices[i]
          const normal = getSideNormal(actualSideIndex, renderN)

          // 공이 이 Side 방향으로 이동 중인지 확인
          const velocityTowardsSide = dot(currentVel, normal)
          if (velocityTowardsSide <= 0) {
            continue
          }

          // 실제 Side 선분과의 충돌 체크
          const [v1, v2] = getSideVertices(actualSideIndex, renderN, arenaRadius)
          const sideCollision = checkBallLineCollision(newPosition, ballRadius, {
            start: v1,
            end: v2,
          })

          if (sideCollision.collided) {
            console.log(`[Ball] OUT! Side ${actualSideIndex} (Player ${i}) passed`)
            onPlayerOut?.(i)

            velocityRef.current = { x: 0, y: 0 }
            return { velocity: { x: 0, y: 0 }, position: newPosition }
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
    isFirstHitRef.current = true // 첫 HIT 상태 리셋
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
