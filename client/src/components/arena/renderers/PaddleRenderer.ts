/**
 * 패들 렌더러
 *
 * 역할:
 * - 각 플레이어의 패들 렌더링
 * - 패들 위치 업데이트
 * - 내 패들 강조 표시
 *
 * 스펙:
 * - 길이: Side 길이 × 0.3 (α)
 * - 두께: 6px (기본), 8px (내 패들)
 * - 색상: 플레이어별 색상, 내 패들은 노란색 강조
 * - 이동 범위: Side 중심 ± (Side 길이 × 0.3)
 *
 * 출처: docs/planning/03_PRD_Arena상세.md
 */

import { Container, Graphics, LINE_CAP } from 'pixi.js'
import {
  getSideCenter,
  getSideTangent,
  getSideLength,
} from '@/physics/geometry'
import { add, multiply } from '@/physics/vector'
import { GAME_CONSTANTS } from '@/utils/constants'

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

export class PaddleRenderer {
  private container: Container
  private graphics: Graphics

  constructor(private options: PaddleRendererOptions) {
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

    const { n, radius, paddles } = this.options

    // Side 길이 계산
    const sideLength = getSideLength(n, radius)

    // 패들 길이 = Side 길이 × α (0.3)
    const paddleLength = sideLength * GAME_CONSTANTS.PADDLE_LENGTH_RATIO

    // 패들 이동 범위 = Side 길이 × β (0.6)
    const moveRange = sideLength * GAME_CONSTANTS.PADDLE_MOVE_RANGE

    // 각 패들 그리기
    paddles.forEach((paddle) => {
      this.drawPaddle(
        paddle,
        n,
        radius,
        paddleLength,
        moveRange
      )
    })
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
