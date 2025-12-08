/**
 * 패들 렌더러
 *
 * 역할:
 * - 각 플레이어의 패들 렌더링
 * - 패들 위치 업데이트
 * - 내 패들 강조 표시
 * - 히트 이펙트 표시 (공이 패들에 맞았을 때)
 *
 * 스펙:
 * - 길이: Side 길이 × 0.3 (α)
 * - 두께: 6px (기본), 8px (내 패들)
 * - 색상: 플레이어별 색상, 내 패들은 노란색 강조
 * - 이동 범위: Side 중심 ± (Side 길이 × 0.3)
 *
 * 출처: docs/planning/03_PRD_Arena상세.md
 */

import { Container, Graphics, LINE_CAP, Ticker } from 'pixi.js'
import {
  getSideCenter,
  getSideTangent,
  getSideLength,
  getSideNormal,
} from '@/physics/geometry'
import { add, multiply } from '@/physics/vector'
import { getPaddleRatios } from '@/utils/constants'

interface PaddleData {
  /** Side 인덱스 */
  sideIndex: number
  /** 패들 위치 (-1 ~ 1, Side 기준 상대 위치) */
  position: number
  /** 플레이어 색상 */
  color: string
  /** 내 패들 여부 */
  isMe: boolean
}

interface PaddleRendererOptions {
  /** 플레이어 수 (변의 개수) */
  n: number
  /** 반지름 */
  radius: number
  /** 패들 데이터 배열 */
  paddles: PaddleData[]
}

interface HitEffect {
  /** Side 인덱스 */
  sideIndex: number
  /** 패들 내 오프셋 (-1 ~ 1) */
  paddleOffset: number
  /** 시작 시간 */
  startTime: number
  /** 지속 시간 (ms) */
  duration: number
}

export class PaddleRenderer {
  private container: Container
  private graphics: Graphics
  private hitEffectGraphics: Graphics
  private hitEffects: HitEffect[] = []
  private ticker: Ticker | null = null

  constructor(private options: PaddleRendererOptions) {
    this.container = new Container()
    this.graphics = new Graphics()
    this.hitEffectGraphics = new Graphics()
    this.container.addChild(this.graphics)
    this.container.addChild(this.hitEffectGraphics)

    this.render()
  }

  /**
   * 렌더링
   */
  private render() {
    this.graphics.clear()

    const { n, radius, paddles } = this.options

    // N-adaptive 패들 비율 가져오기
    const { alpha, beta, renderN } = getPaddleRatios(n)

    // N=2일 때는 Side 0(상단), Side 2(하단)만 플레이어 배치
    const playerSideIndices = n === 2 ? [0, 2] : Array.from({ length: n }, (_, i) => i)

    // Side 길이 계산 (renderN 기준)
    const sideLength = getSideLength(renderN, radius)

    // 패들 길이 = Side 길이 × α (N에 따라 동적)
    const paddleLength = sideLength * alpha

    // 패들 이동 범위 = Side 길이 × β (N에 따라 동적)
    const moveRange = sideLength * beta

    // 각 패들 그리기
    paddles.forEach((paddle, i) => {
      const actualSideIndex = playerSideIndices[i]
      this.drawPaddle(
        { ...paddle, sideIndex: actualSideIndex },
        renderN,
        radius,
        paddleLength,
        moveRange
      )
    })

    // 히트 이펙트 렌더링
    this.renderHitEffects()
  }

  /**
   * 히트 이펙트 렌더링
   */
  private renderHitEffects() {
    this.hitEffectGraphics.clear()

    const now = performance.now()
    const { n, radius, paddles } = this.options
    const { alpha, beta, renderN } = getPaddleRatios(n)
    const playerSideIndices = n === 2 ? [0, 2] : Array.from({ length: n }, (_, i) => i)
    const sideLength = getSideLength(renderN, radius)
    const paddleLength = sideLength * alpha
    const moveRange = sideLength * beta

    // 만료된 이펙트 제거
    this.hitEffects = this.hitEffects.filter(
      (effect) => now - effect.startTime < effect.duration
    )

    // 각 히트 이펙트 그리기
    for (const effect of this.hitEffects) {
      const progress = (now - effect.startTime) / effect.duration // 0 ~ 1
      const easeOut = 1 - Math.pow(1 - progress, 2) // ease-out

      // 해당 Side의 패들 찾기
      const paddleIndex = playerSideIndices.indexOf(effect.sideIndex)
      if (paddleIndex === -1) continue

      const paddle = paddles[paddleIndex]
      if (!paddle) continue

      // 히트 포인트 좌표 계산
      const sideCenter = getSideCenter(effect.sideIndex, renderN, radius)
      const tangent = getSideTangent(effect.sideIndex, renderN)
      const normal = getSideNormal(effect.sideIndex, renderN)

      // 패들 중심 위치
      const paddleCenterOffset = (paddle.position * moveRange) / 2
      const paddleCenter = add(sideCenter, multiply(tangent, paddleCenterOffset))

      // 히트 포인트 = 패들 중심 + (paddleOffset * 패들반길이)
      // Arena가 회전되어 있으므로 paddleOffset 부호 반전
      const hitOffset = -effect.paddleOffset * (paddleLength / 2)
      let hitPoint = add(paddleCenter, multiply(tangent, hitOffset))

      // 히트 포인트를 Arena 안쪽으로 이동 (normal 방향 반대 = 안쪽)
      const inwardOffset = 10 // 패들 안쪽으로 10px
      hitPoint = add(hitPoint, multiply(normal, -inwardOffset))

      // 내부 원 (점점 투명해짐)
      const innerAlpha = 1 - progress
      this.hitEffectGraphics.beginFill(0xfcd34d, innerAlpha)
      this.hitEffectGraphics.drawCircle(hitPoint.x, hitPoint.y, 6)
      this.hitEffectGraphics.endFill()

      // 외부 링 (확장하면서 투명해짐)
      const ringRadius = 6 + easeOut * 14 // 6 → 20
      const ringAlpha = (1 - easeOut) * 0.8
      this.hitEffectGraphics.lineStyle({
        width: 2,
        color: 0xfcd34d,
        alpha: ringAlpha,
      })
      this.hitEffectGraphics.drawCircle(hitPoint.x, hitPoint.y, ringRadius)
    }
  }

  /**
   * 패들 하나 그리기
   */
  private drawPaddle(
    paddle: PaddleData,
    n: number,
    radius: number,
    paddleLength: number,
    moveRange: number
  ) {
    const { sideIndex, position, isMe } = paddle

    // Side 중심 좌표
    const sideCenter = getSideCenter(sideIndex, n, radius)

    // Side 탄젠트 벡터 (패들 이동 방향)
    const tangent = getSideTangent(sideIndex, n)

    // 패들 중심 위치 = Side 중심 + 탄젠트 × (position × moveRange/2)
    // position: -1(왼쪽 끝) ~ 0(중앙) ~ 1(오른쪽 끝)
    const offset = (position * moveRange) / 2
    const paddleCenter = add(sideCenter, multiply(tangent, offset))

    // 패들 양 끝점 계산
    const halfLength = paddleLength / 2
    const paddleStart = add(paddleCenter, multiply(tangent, -halfLength))
    const paddleEnd = add(paddleCenter, multiply(tangent, halfLength))

    // 패들 스타일
    const thickness = isMe ? 8 : 6
    const color = isMe ? 0xfcd34d : parseInt(paddle.color.replace('#', ''), 16)
    const alpha = 1.0

    // 라운드 캡 라인으로 패들 그리기
    this.graphics.lineStyle({
      width: thickness,
      color,
      alpha,
      cap: LINE_CAP.ROUND, // 둥근 끝
    })

    this.graphics.moveTo(paddleStart.x, paddleStart.y)
    this.graphics.lineTo(paddleEnd.x, paddleEnd.y)

    // 내 패들 글로우 효과 (선택적)
    if (isMe) {
      this.graphics.lineStyle({
        width: thickness + 4,
        color: 0xfcd34d,
        alpha: 0.3,
        cap: LINE_CAP.ROUND,
      })
      this.graphics.moveTo(paddleStart.x, paddleStart.y)
      this.graphics.lineTo(paddleEnd.x, paddleEnd.y)
    }
  }

  /**
   * 옵션 업데이트 및 재렌더링
   */
  update(options: Partial<PaddleRendererOptions>) {
    Object.assign(this.options, options)
    this.render()
  }

  /**
   * 히트 이펙트 표시
   *
   * @param sideIndex - Side 인덱스
   * @param paddleOffset - 패들 내 오프셋 (-1 ~ 1, 왼쪽 끝 ~ 오른쪽 끝)
   * @param duration - 지속 시간 (ms, 기본 200ms)
   */
  showHitEffect(sideIndex: number, paddleOffset: number, duration: number = 200) {
    this.hitEffects.push({
      sideIndex,
      paddleOffset,
      startTime: performance.now(),
      duration,
    })

    // Ticker가 없으면 시작
    if (!this.ticker) {
      this.ticker = Ticker.shared
      this.ticker.add(this.tickHitEffects, this)
    }
  }

  /**
   * 히트 이펙트 틱 (애니메이션)
   */
  private tickHitEffects() {
    this.renderHitEffects()

    // 모든 이펙트가 끝나면 Ticker 정리
    if (this.hitEffects.length === 0 && this.ticker) {
      this.ticker.remove(this.tickHitEffects, this)
      this.ticker = null
    }
  }

  /**
   * 컨테이너 가져오기
   */
  getContainer(): Container {
    return this.container
  }

  /**
   * 정리
   */
  destroy() {
    if (this.ticker) {
      this.ticker.remove(this.tickHitEffects, this)
      this.ticker = null
    }
    this.hitEffects = []
    if (this.graphics && !this.graphics.destroyed) {
      this.graphics.destroy()
    }
    if (this.hitEffectGraphics && !this.hitEffectGraphics.destroyed) {
      this.hitEffectGraphics.destroy()
    }
    if (this.container && !this.container.destroyed) {
      this.container.destroy()
    }
  }
}
