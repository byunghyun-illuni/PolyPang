/**
 * 터치 입력 영역 컴포넌트
 *
 * 역할:
 * - 화면 하단 38% 영역에 좌/우 터치 감지
 * - 터치 피드백 (배경 밝아짐)
 * - PC에서는 키보드 가이드 표시
 *
 * 레이아웃:
 * - 왼쪽 50%: LEFT
 * - 오른쪽 50%: RIGHT
 *
 * 출처: docs/planning/02_PRD_화면기획.md
 */

interface TouchInputAreaProps {
  /** 터치 시작 콜백 */
  onTouchStart: (direction: 'LEFT' | 'RIGHT') => void
  /** 터치 종료 콜백 */
  onTouchEnd: () => void
  /** 현재 터치 중 여부 */
  isTouching?: boolean
  /** 현재 터치 방향 */
  touchingDirection?: 'LEFT' | 'RIGHT' | 'NONE'
}

export default function TouchInputArea({
  onTouchStart,
  onTouchEnd,
  isTouching = false,
  touchingDirection = 'NONE',
}: TouchInputAreaProps) {
  const handleLeftTouch = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    onTouchStart('LEFT')
  }

  const handleRightTouch = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    onTouchStart('RIGHT')
  }

  const handleTouchEndOrLeave = () => {
    onTouchEnd()
  }

  return (
    <div className="relative flex h-full select-none">
      {/* 왼쪽 터치 영역 */}
      <div
        className={`flex-1 flex items-center justify-center transition-all ${
          isTouching && touchingDirection === 'LEFT'
            ? 'bg-purple-500/20'
            : 'bg-transparent hover:bg-purple-500/5'
        }`}
        onTouchStart={handleLeftTouch}
        onMouseDown={handleLeftTouch}
        onTouchEnd={handleTouchEndOrLeave}
        onMouseUp={handleTouchEndOrLeave}
        onMouseLeave={handleTouchEndOrLeave}
      >
        <div className="text-3xl text-gray-500/30">◀</div>
      </div>

      {/* 오른쪽 터치 영역 */}
      <div
        className={`flex-1 flex items-center justify-center transition-all ${
          isTouching && touchingDirection === 'RIGHT'
            ? 'bg-blue-500/20'
            : 'bg-transparent hover:bg-blue-500/5'
        }`}
        onTouchStart={handleRightTouch}
        onMouseDown={handleRightTouch}
        onTouchEnd={handleTouchEndOrLeave}
        onMouseUp={handleTouchEndOrLeave}
        onMouseLeave={handleTouchEndOrLeave}
      >
        <div className="text-3xl text-gray-500/30">▶</div>
      </div>

      {/* PC 키보드 가이드 - 하단에 고정 */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
        <div className="px-3 py-1 text-gray-500/50 text-xs">
          PC: A/D 또는 ←/→
        </div>
      </div>
    </div>
  )
}
