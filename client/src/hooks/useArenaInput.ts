/**
 * Arena 입력 처리 Hook
 *
 * 역할:
 * - 키보드 입력 감지 (A/D, ←/→)
 * - 터치 입력 감지 (화면 좌/우)
 * - 입력 상태 관리 (LEFT, RIGHT, NONE)
 *
 * 출처: docs/planning/02_PRD_화면기획.md
 */

import { useEffect, useState, useCallback } from 'react'

export type InputDirection = 'LEFT' | 'RIGHT' | 'NONE'

interface UseArenaInputOptions {
  /** 터치 입력 활성화 */
  enableTouch?: boolean
  /** 키보드 입력 활성화 */
  enableKeyboard?: boolean
}

export function useArenaInput(options: UseArenaInputOptions = {}) {
  const { enableTouch = true, enableKeyboard = true } = options

  const [direction, setDirection] = useState<InputDirection>('NONE')
  const [isTouching, setIsTouching] = useState(false)

  // 키보드 입력 처리
  useEffect(() => {
    if (!enableKeyboard) return

    const pressedKeys = new Set<string>()

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // 방향키 또는 A/D 키
      if (['arrowleft', 'a'].includes(key)) {
        pressedKeys.add('left')
      } else if (['arrowright', 'd'].includes(key)) {
        pressedKeys.add('right')
      }

      updateDirection()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      if (['arrowleft', 'a'].includes(key)) {
        pressedKeys.delete('left')
      } else if (['arrowright', 'd'].includes(key)) {
        pressedKeys.delete('right')
      }

      updateDirection()
    }

    const updateDirection = () => {
      const hasLeft = pressedKeys.has('left')
      const hasRight = pressedKeys.has('right')

      if (hasLeft && hasRight) {
        setDirection('NONE') // 양쪽 동시 입력 시 정지
      } else if (hasLeft) {
        setDirection('LEFT')
      } else if (hasRight) {
        setDirection('RIGHT')
      } else {
        setDirection('NONE')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [enableKeyboard])

  // 터치 입력 핸들러 (컴포넌트에서 호출)
  const handleTouchStart = useCallback(
    (touchDirection: 'LEFT' | 'RIGHT') => {
      if (!enableTouch) return
      setDirection(touchDirection)
      setIsTouching(true)
    },
    [enableTouch]
  )

  const handleTouchEnd = useCallback(() => {
    if (!enableTouch) return
    setDirection('NONE')
    setIsTouching(false)
  }, [enableTouch])

  return {
    direction,
    isTouching,
    handleTouchStart,
    handleTouchEnd,
  }
}
