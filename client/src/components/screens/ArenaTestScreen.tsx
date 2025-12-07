/**
 * Arena 테스트 화면
 *
 * 목적:
 * - 정N각형 렌더링 테스트
 * - 내 Side 하단 고정 회전 로직 검증
 * - N=2,3,5,8 모두 테스트
 */

import { useState, useCallback } from 'react'
import { Application, Container } from 'pixi.js'
import ArenaCanvas from '@/components/arena/ArenaCanvas'
import { PolygonRenderer } from '@/components/arena/renderers/PolygonRenderer'
import { PaddleRenderer } from '@/components/arena/renderers/PaddleRenderer'
import { BallRenderer } from '@/components/arena/renderers/BallRenderer'
import { OutZoneRenderer } from '@/components/arena/renderers/OutZoneRenderer'
import TouchInputArea from '@/components/ui/TouchInputArea'
import { getArenaRotationForMyPlayer, degToRad } from '@/physics/geometry'
import { getPlayerColor } from '@/utils/colors'
import { useArenaInput } from '@/hooks/useArenaInput'
import { usePaddlePhysics } from '@/hooks/usePaddlePhysics'
import { useBallPhysics } from '@/hooks/useBallPhysics'
import { useGameState } from '@/hooks/useGameState'

export default function ArenaTestScreen() {
  const [initialPlayerCount, setInitialPlayerCount] = useState(5) // 초기 플레이어 수
  const [arenaRadius, setArenaRadius] = useState(150) // Arena 반지름

  // 게임 상태 관리
  const {
    gameStatus,
    alivePlayers,
    playerCount,
    myPlayerIndex,
    winner,
    handlePlayerOut,
    startGame,
    restartGame,
  } = useGameState({
    initialPlayers: Array.from({ length: initialPlayerCount }, (_, i) => ({
      id: `player-${i}`,
      nickname: `Player${i + 1}`,
    })),
    myPlayerId: 'player-0', // 항상 Player1이 나
  })

  // 입력 처리
  const { direction, isTouching, handleTouchStart, handleTouchEnd } =
    useArenaInput()

  // 내 패들 물리
  const { position: myPaddlePosition } = usePaddlePhysics({
    direction,
    initialPosition: 0,
  })

  // 다른 플레이어 패들 (임시로 고정)
  const otherPaddlePositions = Array(8).fill(0)

  // 패들 정보
  const paddleInfos = Array.from({ length: playerCount }, (_, i) => ({
    sideIndex: i,
    position: i === myPlayerIndex ? myPaddlePosition : otherPaddlePositions[i] || 0,
  }))

  // 공 물리
  const {
    position: ballPosition,
    trail: ballTrail,
    hitEffectActive,
  } = useBallPhysics({
    playerCount,
    arenaRadius,
    paddles: paddleInfos,
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 30, y: 25 }, // 속도 절반으로 감소
    onPlayerOut: handlePlayerOut,
    onPaddleHit: (sideIndex) => {
      console.log(`HIT on Side ${sideIndex}`)
    },
  })

  const handleRender = useCallback(
    (app: Application) => {
      // 기존 컨테이너 제거
      app.stage.removeChildren()

      // Arena 컨테이너
      const arenaContainer = new Container()
      app.stage.addChild(arenaContainer)

      // 화면 중앙 배치
      arenaContainer.x = app.screen.width / 2
      arenaContainer.y = app.screen.height / 2

      // Arena 반지름 계산 (화면의 38%)
      const radius = Math.min(app.screen.width, app.screen.height) * 0.38

      // arenaRadius 업데이트
      setArenaRadius(radius)

      // 정N각형 렌더러 (매번 새로 생성)
      const polygonRenderer = new PolygonRenderer({
        n: playerCount,
        radius,
        players: alivePlayers.map((p) => ({
          userId: p.id,
          nickname: p.nickname,
        })),
        myPlayerIndex,
      })

      arenaContainer.addChild(polygonRenderer.getContainer())

      // OUT 존 렌더러 (매번 새로 생성)
      const outZoneRenderer = new OutZoneRenderer({
        n: playerCount,
        radius,
        thickness: 30,
      })

      arenaContainer.addChild(outZoneRenderer.getContainer())

      // 패들 렌더러 (매번 새로 생성)
      const paddleData = Array.from({ length: playerCount }, (_, i) => ({
        sideIndex: i,
        position: i === myPlayerIndex ? myPaddlePosition : otherPaddlePositions[i] || 0,
        color: getPlayerColor(i),
        isMe: i === myPlayerIndex,
      }))

      const paddleRenderer = new PaddleRenderer({
        n: playerCount,
        radius,
        paddles: paddleData,
      })

      arenaContainer.addChild(paddleRenderer.getContainer())

      // 공 렌더러 (매번 새로 생성)
      const ballRenderer = new BallRenderer({
        position: ballPosition,
        arenaRadius: radius,
        trail: ballTrail,
        hitEffectActive,
      })

      arenaContainer.addChild(ballRenderer.getContainer())

      // 🌟 핵심: 내 Side 하단 고정 회전
      const rotation = getArenaRotationForMyPlayer(myPlayerIndex, playerCount)
      arenaContainer.rotation = degToRad(rotation)

      console.log(
        `[Arena] N=${playerCount}, myIndex=${myPlayerIndex}, rotation=${rotation.toFixed(1)}°`
      )
    },
    [playerCount, myPlayerIndex, alivePlayers, myPaddlePosition, otherPaddlePositions, ballPosition, ballTrail, hitEffectActive]
  )

  return (
    <div className="flex flex-col h-full">
      {/* 컨트롤 패널 */}
      <div className="bg-gray-800 text-white p-4 space-y-3">
        <div className="text-center">
          <h2 className="text-xl font-bold">Arena Test: 내 Side 하단 고정</h2>
          <p className="text-sm text-gray-400 mt-1">
            모든 플레이어는 자신의 Side가 항상 화면 하단에 위치
          </p>
        </div>

        {/* 게임 상태 */}
        <div className="flex items-center justify-center gap-4">
          <div className="text-sm">
            상태: <span className="font-bold text-purple-400">{gameStatus}</span>
          </div>
          <div className="text-sm">
            Alive: <span className="font-bold text-green-400">{playerCount}</span>
          </div>
          {winner && (
            <div className="text-sm">
              승자: <span className="font-bold text-yellow-400">{winner.nickname}</span>
            </div>
          )}
        </div>

        {/* 게임 컨트롤 */}
        <div className="flex items-center justify-center gap-2">
          {gameStatus === 'LOBBY' && (
            <>
              <span className="text-sm w-20">초기 인원:</span>
              <div className="flex gap-2">
                {[2, 3, 5, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setInitialPlayerCount(n)
                      restartGame()
                    }}
                    className={`px-4 py-2 rounded ${
                      initialPlayerCount === n
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {n}명
                  </button>
                ))}
              </div>
              <button
                onClick={startGame}
                className="ml-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                게임 시작
              </button>
            </>
          )}
          {gameStatus === 'FINISHED' && (
            <button
              onClick={restartGame}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              다시 시작
            </button>
          )}
        </div>

        {/* 내 패들 위치 표시 */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm w-20">내 패들:</span>
          <div className="flex-1 max-w-xs bg-gray-700 rounded-full h-2 relative">
            <div
              className="absolute top-0 left-1/2 w-1 h-2 bg-yellow-400 rounded-full transition-transform"
              style={{
                transform: `translateX(calc(-50% + ${myPaddlePosition * 50}%))`,
              }}
            />
          </div>
          <span className="text-sm font-mono w-24">
            {myPaddlePosition.toFixed(2)}
          </span>
        </div>

        {/* 입력 상태 표시 */}
        <div className="text-center text-xs text-gray-400">
          입력: {direction} {isTouching ? '(터치 중)' : ''}
        </div>

        {/* 정보 */}
        <div className="text-center text-xs text-gray-400">
          회전: {getArenaRotationForMyPlayer(myPlayerIndex, playerCount).toFixed(
            1
          )}
          ° | Side 각도:{' '}
          {((360 / playerCount) * myPlayerIndex - 90).toFixed(1)}°
        </div>
      </div>

      {/* Arena 캔버스 (52%) */}
      <div className="bg-gray-900" style={{ height: '52%' }}>
        <ArenaCanvas onRender={handleRender} />
      </div>

      {/* 조작 영역 (38%) */}
      <div className="bg-gray-900" style={{ height: '38%' }}>
        <TouchInputArea
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          isTouching={isTouching}
          touchingDirection={direction}
        />
      </div>

      {/* 하단 설명 */}
      <div className="bg-gray-800 text-white p-2 text-center">
        <p className="text-xs text-gray-400">
          키보드(A/D 또는 ←/→) 또는 터치로 패들을 조작하세요! 🎮
        </p>
      </div>
    </div>
  )
}
