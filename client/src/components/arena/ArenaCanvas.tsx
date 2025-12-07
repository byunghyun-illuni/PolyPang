/**
 * Arena PixiJS 캔버스 컴포넌트
 *
 * 역할:
 * - PixiJS Application 초기화
 * - Arena 렌더링 컨테이너
 * - 화면 크기 대응
 */

import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'

interface ArenaCanvasProps {
  /** Arena 렌더 함수 (app을 받아서 렌더링) */
  onRender: (app: Application) => void
  /** 컨테이너 클래스 */
  className?: string
}

export default function ArenaCanvas({ onRender, className = '' }: ArenaCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // PixiJS Application 초기화
    const app = new Application({
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    canvasRef.current.appendChild(app.view as HTMLCanvasElement)
    appRef.current = app

    // 렌더링 콜백 실행
    onRender(app)

    // 리사이즈 핸들러
    const handleResize = () => {
      if (app && canvasRef.current) {
        app.renderer.resize(
          canvasRef.current.clientWidth,
          canvasRef.current.clientHeight
        )
        // 렌더링 갱신
        onRender(app)
      }
    }

    window.addEventListener('resize', handleResize)

    // 클린업
    return () => {
      window.removeEventListener('resize', handleResize)
      if (app) {
        app.destroy(true, { children: true })
      }
    }
  }, [onRender])

  return (
    <div
      ref={canvasRef}
      className={`arena-canvas ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
