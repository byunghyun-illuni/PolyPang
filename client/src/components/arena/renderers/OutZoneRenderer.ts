/**
 * OUT 존 렌더러
 *
 * 역할:
 * - 각 Side 뒤쪽에 빨간색 OUT 존 표시
 * - 플레이어가 막아야 하는 영역을 시각적으로 표시
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
}

export class OutZoneRenderer {
  private container: Container
  private graphics: Graphics

  constructor(private options: OutZoneRendererOptions) {
    this.container = new Container()
    this.graphics = new Graphics()
    this.container.addChild(this.graphics)

    this.render()
  }

  /**
   * 렌더링
   */
  private render() {
    this.graphics.clear()

    const { n, radius, thickness = 30, outSideIndex } = this.options

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
      const alpha = isOutSide ? 0.6 : 0.15
      const color = isOutSide ? 0xff3333 : 0xff0000

      // 빨간색 반투명 사각형
      this.graphics.beginFill(color, alpha)
      this.graphics.moveTo(v1.x, v1.y)
      this.graphics.lineTo(v2.x, v2.y)
      this.graphics.lineTo(outerV2.x, outerV2.y)
      this.graphics.lineTo(outerV1.x, outerV1.y)
      this.graphics.closePath()
      this.graphics.endFill()

      // OUT 존 경계선
      const borderAlpha = isOutSide ? 0.8 : 0.3
      const borderWidth = isOutSide ? 2 : 1
      this.graphics.lineStyle(borderWidth, color, borderAlpha)
      this.graphics.moveTo(outerV1.x, outerV1.y)
      this.graphics.lineTo(outerV2.x, outerV2.y)
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
    this.container.destroy()
  }
}
