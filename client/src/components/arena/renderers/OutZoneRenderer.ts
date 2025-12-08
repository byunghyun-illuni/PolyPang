/**
 * OUT 존 렌더러
 *
 * 역할:
 * - 각 Side 뒤쪽에 빨간색 OUT 존 표시
 * - 플레이어가 막아야 하는 영역을 시각적으로 표시
 * - OUT 발생 시 강렬한 플래시 효과
 *
 * 출처: UX 개선 (패들 뒤 = OUT 존)
 */

import { Container, Graphics } from 'pixi.js'
import { getSideVertices } from '@/physics/geometry'

interface OutZoneRendererOptions {
  /** 플레이어 수 (N) */
  n: number
  /** Arena 반지름 */
  radius: number
  /** OUT 존 두께 (Side 뒤쪽으로 확장) */
  thickness?: number
  /** OUT된 Side 인덱스 (강조 표시) */
  outSideIndex?: number
  /** 펄스 애니메이션 진행도 (0~1) */
  pulseProgress?: number
}

export class OutZoneRenderer {
  private container: Container
  private graphics: Graphics
  private flashGraphics: Graphics // OUT 플래시 효과용

  constructor(private options: OutZoneRendererOptions) {
    this.container = new Container()
    this.graphics = new Graphics()
    this.flashGraphics = new Graphics()
    this.container.addChild(this.graphics)
    this.container.addChild(this.flashGraphics)

    this.render()
  }

  /**
   * 렌더링
   */
  private render() {
    this.graphics.clear()
    this.flashGraphics.clear()

    const { n, radius, thickness = 30, outSideIndex, pulseProgress = 0 } = this.options

    // 각 Side 뒤에 OUT 존 그리기
    for (let i = 0; i < n; i++) {
      const [v1, v2] = getSideVertices(i, n, radius)

      // Side 중심에서 바깥쪽 방향 벡터 계산
      const centerX = (v1.x + v2.x) / 2
      const centerY = (v1.y + v2.y) / 2
      const length = Math.sqrt(centerX * centerX + centerY * centerY)
      const normalX = centerX / length
      const normalY = centerY / length

      // OUT 존 사각형 좌표 (Side 뒤쪽)
      const outerV1 = {
        x: v1.x + normalX * thickness,
        y: v1.y + normalY * thickness,
      }
      const outerV2 = {
        x: v2.x + normalX * thickness,
        y: v2.y + normalY * thickness,
      }

      // OUT된 Side는 강조 표시
      const isOutSide = outSideIndex === i

      if (isOutSide) {
        // OUT된 Side: 강렬한 플래시 효과
        // 펄스 애니메이션 (깜빡임)
        const pulseAlpha = 0.4 + Math.sin(pulseProgress * Math.PI * 6) * 0.3

        // 빨간색 강조 영역 (더 넓게)
        const flashThickness = thickness * 2.5
        const flashOuterV1 = {
          x: v1.x + normalX * flashThickness,
          y: v1.y + normalY * flashThickness,
        }
        const flashOuterV2 = {
          x: v2.x + normalX * flashThickness,
          y: v2.y + normalY * flashThickness,
        }

        // 외부 글로우 효과
        this.flashGraphics.beginFill(0xff0000, pulseAlpha * 0.5)
        this.flashGraphics.moveTo(v1.x, v1.y)
        this.flashGraphics.lineTo(v2.x, v2.y)
        this.flashGraphics.lineTo(flashOuterV2.x, flashOuterV2.y)
        this.flashGraphics.lineTo(flashOuterV1.x, flashOuterV1.y)
        this.flashGraphics.closePath()
        this.flashGraphics.endFill()

        // 내부 강조 영역
        this.graphics.beginFill(0xff3333, pulseAlpha)
        this.graphics.moveTo(v1.x, v1.y)
        this.graphics.lineTo(v2.x, v2.y)
        this.graphics.lineTo(outerV2.x, outerV2.y)
        this.graphics.lineTo(outerV1.x, outerV1.y)
        this.graphics.closePath()
        this.graphics.endFill()

        // Side 자체도 빨간색 강조
        this.graphics.lineStyle(4, 0xff0000, pulseAlpha + 0.3)
        this.graphics.moveTo(v1.x, v1.y)
        this.graphics.lineTo(v2.x, v2.y)

        // 경계선 (두껍게)
        this.graphics.lineStyle(3, 0xff0000, 0.9)
        this.graphics.moveTo(outerV1.x, outerV1.y)
        this.graphics.lineTo(outerV2.x, outerV2.y)
      } else {
        // 일반 Side: 기본 OUT 존
        this.graphics.beginFill(0xff0000, 0.15)
        this.graphics.moveTo(v1.x, v1.y)
        this.graphics.lineTo(v2.x, v2.y)
        this.graphics.lineTo(outerV2.x, outerV2.y)
        this.graphics.lineTo(outerV1.x, outerV1.y)
        this.graphics.closePath()
        this.graphics.endFill()

        // 경계선
        this.graphics.lineStyle(1, 0xff0000, 0.3)
        this.graphics.moveTo(outerV1.x, outerV1.y)
        this.graphics.lineTo(outerV2.x, outerV2.y)
      }
    }
  }

  /**
   * 옵션 업데이트 및 재렌더링
   */
  update(options: Partial<OutZoneRendererOptions>) {
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
    this.graphics.destroy()
    this.flashGraphics.destroy()
    this.container.destroy()
  }
}
