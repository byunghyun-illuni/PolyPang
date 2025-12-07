/**
 * 공 렌더러
 *
 * 역할:
 * - 공 렌더링
 * - 트레일 효과
 * - HIT 이펙트 (트레일 강화)
 *
 * 스펙:
 * - 직경: Arena 크기 × 0.025~0.035
 * - 트레일: 공 직경 × 2~3배 길이
 * - HIT 직후: 0.3초간 트레일 강화
 *
 * 출처: docs/planning/03_PRD_Arena상세.md
 */

import { Container, Graphics, LINE_CAP } from 'pixi.js'
import type { Vector2D } from '@/types'
import { GAME_CONSTANTS } from '@/utils/constants'

interface BallRendererOptions {
  /** 공 위치 */
  position: Vector2D
  /** Arena 반지름 (공 크기 계산용) */
  arenaRadius: number
  /** 트레일 히스토리 (최근 위치들) */
  trail?: Vector2D[]
  /** HIT 이펙트 활성화 여부 */
  hitEffectActive?: boolean
}

export class BallRenderer {
  private container: Container
  private ballGraphics: Graphics
  private trailGraphics: Graphics
  private ballRadius: number

  constructor(private options: BallRendererOptions) {
    this.container = new Container()
    this.ballGraphics = new Graphics()
    this.trailGraphics = new Graphics()

    // 트레일은 공 뒤에 그려져야 함
    this.container.addChild(this.trailGraphics)
    this.container.addChild(this.ballGraphics)

    // 공 반지름 계산
    this.ballRadius = options.arenaRadius * GAME_CONSTANTS.BALL_RADIUS_RATIO

    this.render()
  }

  /**
   * 렌더링
   */
  private render() {
    this.renderTrail()
    this.renderBall()
  }

  /**
   * 트레일 렌더링
   */
  private renderTrail() {
    this.trailGraphics.clear()

    const { trail, hitEffectActive } = this.options

    if (!trail || trail.length < 2) return

    // HIT 이펙트 활성화 시 트레일 강화
    const trailLength = hitEffectActive
      ? trail.length
      : Math.min(trail.length, 10)

    for (let i = 0; i < trailLength - 1; i++) {
      const p1 = trail[i]
      const p2 = trail[i + 1]

      // 트레일 알파: 뒤로 갈수록 투명
      const alpha = ((i + 1) / trailLength) * (hitEffectActive ? 0.8 : 0.5)

      // 트레일 두께: 뒤로 갈수록 얇아짐
      const width =
        this.ballRadius * 2 * ((i + 1) / trailLength) * (hitEffectActive ? 1.5 : 1)

      this.trailGraphics.lineStyle({
        width,
        color: 0xffffff,
        alpha,
        cap: LINE_CAP.ROUND,
      })

      this.trailGraphics.moveTo(p1.x, p1.y)
      this.trailGraphics.lineTo(p2.x, p2.y)
    }
  }

  /**
   * 공 렌더링
   */
  private renderBall() {
    this.ballGraphics.clear()

    const { position, hitEffectActive } = this.options

    // 공 스타일
    const color = 0xffffff
    const alpha = 1.0

    // 공 그리기
    this.ballGraphics.beginFill(color, alpha)
    this.ballGraphics.drawCircle(position.x, position.y, this.ballRadius)
    this.ballGraphics.endFill()

    // HIT 이펙트: 외곽 글로우
    if (hitEffectActive) {
      this.ballGraphics.lineStyle({
        width: 2,
        color: 0xfcd34d,
        alpha: 0.8,
      })
      this.ballGraphics.drawCircle(
        position.x,
        position.y,
        this.ballRadius + 4
      )
    }
  }

  /**
   * 옵션 업데이트 및 재렌더링
   */
  update(options: Partial<BallRendererOptions>) {
    Object.assign(this.options, options)
    this.render()
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
    this.ballGraphics.destroy()
    this.trailGraphics.destroy()
    this.container.destroy()
  }
}
