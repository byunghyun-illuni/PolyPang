/**
 * 정N각형 렌더러
 *
 * 역할:
 * - 정N각형 외곽선 그리기
 * - Side별 색상 표시
 * - 플레이어 라벨 표시
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import {
  getAllVertices,
  getSideCenter,
  degToRad,
} from '@/physics/geometry'
import { getPaddleRatios } from '@/utils/constants'

interface PolygonRendererOptions {
  /** 플레이어 수 (변의 개수) */
  n: number
  /** 반지름 */
  radius: number
  /** 플레이어 닉네임 배열 */
  players: Array<{ nickname: string; userId: string }>
  /** 내 플레이어 인덱스 */
  myPlayerIndex: number
  /** Arena 회전 각도 (라벨 역회전용) */
  arenaRotation?: number
}

export class PolygonRenderer {
  private container: Container
  private graphics: Graphics
  private labels: Text[] = []

  constructor(private options: PolygonRendererOptions) {
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
    this.clearLabels()

    const { n, radius, players, myPlayerIndex } = this.options

    // N=2일 때는 정사각형(N=4)으로 렌더링
    const { renderN } = getPaddleRatios(n)

    // 정N각형 외곽선 그리기 (renderN 사용)
    this.drawPolygon(renderN, radius)

    // 플레이어 라벨 그리기 (실제 플레이어 수: n, 렌더링 수: renderN)
    this.drawLabels(n, renderN, radius, players, myPlayerIndex)
  }

  /**
   * 정N각형 외곽선 그리기
   */
  private drawPolygon(n: number, radius: number) {
    const vertices = getAllVertices(n, radius)

    this.graphics.lineStyle(2, 0xd0d0d0, 1)

    this.graphics.moveTo(vertices[0].x, vertices[0].y)
    for (let i = 1; i < vertices.length; i++) {
      this.graphics.lineTo(vertices[i].x, vertices[i].y)
    }
    this.graphics.lineTo(vertices[0].x, vertices[0].y) // 닫기
  }

  /**
   * 플레이어 라벨 그리기
   * @param actualN - 실제 플레이어 수
   * @param renderN - 렌더링용 다각형 변의 수
   */
  private drawLabels(
    actualN: number,
    renderN: number,
    radius: number,
    players: Array<{ nickname: string; userId: string }>,
    myPlayerIndex: number
  ) {
    // N=2일 때는 Side 0(상단), Side 2(하단)만 플레이어 배치
    const playerSideIndices = actualN === 2 ? [0, 2] : Array.from({ length: actualN }, (_, i) => i)

    // Arena 회전 각도 (라벨 역회전용)
    const arenaRotation = this.options.arenaRotation || 0

    for (let i = 0; i < actualN; i++) {
      const sideIndex = playerSideIndices[i]
      const center = getSideCenter(sideIndex, renderN, radius * 1.15) // 바깥쪽으로
      const isMe = i === myPlayerIndex

      const text = isMe ? `${players[i]?.nickname || `P${i + 1}`} (YOU)` : players[i]?.nickname || `P${i + 1}`

      const style = new TextStyle({
        fontFamily: 'Arial',
        fontSize: isMe ? 14 : 12,
        fill: isMe ? 0xfcd34d : 0xffffff,
        fontWeight: isMe ? 'bold' : 'normal',
      })

      const label = new Text(text, style)

      label.anchor.set(0.5)
      label.x = center.x
      label.y = center.y

      // Arena 회전의 역방향으로 라벨 회전 (텍스트가 항상 정방향으로 보이도록)
      label.rotation = -degToRad(arenaRotation)

      this.labels.push(label)
      this.container.addChild(label)
    }
  }

  /**
   * 라벨 제거
   */
  private clearLabels() {
    this.labels.forEach((label) => {
      this.container.removeChild(label)
      label.destroy()
    })
    this.labels = []
  }

  /**
   * 옵션 업데이트 및 재렌더링
   */
  update(options: Partial<PolygonRendererOptions>) {
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
    this.clearLabels()
    this.graphics.destroy()
    this.container.destroy()
  }
}
