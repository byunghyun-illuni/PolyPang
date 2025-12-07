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
} from '@/physics/geometry'
import { getPlayerColor } from '@/utils/colors'

interface PolygonRendererOptions {
  /** 플레이어 수 (변의 개수) */
  n: number
  /** 반지름 */
  radius: number
  /** 플레이어 닉네임 배열 */
  players: Array<{ nickname: string; userId: string }>
  /** 내 플레이어 인덱스 */
  myPlayerIndex: number
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

    // 정N각형 외곽선 그리기
    this.drawPolygon(n, radius)

    // Side별 색상 표시
    this.drawSides(n, radius, players, myPlayerIndex)

    // 플레이어 라벨 그리기
    this.drawLabels(n, radius, players, myPlayerIndex)
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
   * Side별 색상 띠 그리기
   */
  private drawSides(
    n: number,
    radius: number,
    _players: Array<{ nickname: string; userId: string }>,
    myPlayerIndex: number
  ) {
    const vertices = getAllVertices(n, radius)

    for (let i = 0; i < n; i++) {
      const v1 = vertices[i]
      const v2 = vertices[(i + 1) % n]

      // Side 중앙 60% 구간에만 색상 띠
      const center = {
        x: (v1.x + v2.x) / 2,
        y: (v1.y + v2.y) / 2,
      }
      const direction = {
        x: v2.x - v1.x,
        y: v2.y - v1.y,
      }
      const length = Math.sqrt(direction.x ** 2 + direction.y ** 2)

      const coloredStart = {
        x: center.x - (direction.x / length) * (length * 0.3),
        y: center.y - (direction.y / length) * (length * 0.3),
      }
      const coloredEnd = {
        x: center.x + (direction.x / length) * (length * 0.3),
        y: center.y + (direction.y / length) * (length * 0.3),
      }

      // 색상 결정
      const color = getPlayerColor(i)
      const width = i === myPlayerIndex ? 4 : 2 // 내 Side는 더 두껍게

      this.graphics.lineStyle(width, parseInt(color.replace('#', ''), 16), 1)
      this.graphics.moveTo(coloredStart.x, coloredStart.y)
      this.graphics.lineTo(coloredEnd.x, coloredEnd.y)
    }
  }

  /**
   * 플레이어 라벨 그리기
   */
  private drawLabels(
    n: number,
    radius: number,
    players: Array<{ nickname: string; userId: string }>,
    myPlayerIndex: number
  ) {
    for (let i = 0; i < n; i++) {
      const center = getSideCenter(i, n, radius * 1.15) // 바깥쪽으로
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
