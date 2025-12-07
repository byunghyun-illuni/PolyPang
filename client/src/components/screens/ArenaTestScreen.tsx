/**
 * Arena 테스트 화면
 *
 * 목적:
 * - 정N각형 렌더링 테스트
 * - 내 Side 하단 고정 회전 로직 검증
 * - N=2,3,5,8 모두 테스트
 * - 패들 및 공 물리 시뮬레이션
 */

import { useState, useCallback, useRef, useMemo } from 'react'
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
  const [lastOutSide, setLastOutSide] = useState<number | null>(null) // 마지막 OUT Side
  const [isPaused, setIsPaused] = useState(false) // 게임 일시정지

  // 플레이어 목록 (initialPlayerCount 변경 시마다 재생성)
  const initialPlayers = useMemo(
    () =>
      Array.from({ length: initialPlayerCount }, (_, i) => ({
        id: `player-${i}`,
        nickname: `Player${i + 1}`,
      })),
    [initialPlayerCount]
  )

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
    initialPlayers,
    myPlayerId: 'player-0', // 항상 Player1이 나
  })

  // 렌더러 참조 (한 번만 생성)
  const arenaContainerRef = useRef<Container | null>(null)
  const polygonRendererRef = useRef<PolygonRenderer | null>(null)
  const outZoneRendererRef = useRef<OutZoneRenderer | null>(null)
  const paddleRendererRef = useRef<PaddleRenderer | null>(null)
  const ballRendererRef = useRef<BallRenderer | null>(null)

  // 입력 처리
  const { direction, isTouching, handleTouchStart, handleTouchEnd } =
    useArenaInput()

  // 내 패들 물리
  const { position: myPaddlePosition } = usePaddlePhysics({
    direction,
    initialPosition: 0,
  })

  // 패들 정보 (useMemo로 안정화)
  const paddleInfos = useMemo(
    () =>
      Array.from({ length: playerCount }, (_, i) => ({
        sideIndex: i,
        position: i === myPlayerIndex ? myPaddlePosition : 0,
      })),
    [playerCount, myPlayerIndex, myPaddlePosition]
  )

  // 공 물리 (arenaRadius는 동적으로 계산하므로 초기값만 전달)
  const {
    position: ballPosition,
    trail: ballTrail,
    hitEffectActive,
    reset: resetBall,
  } = useBallPhysics({
    playerCount,
    arenaRadius: 150, // 초기값 (실제 값은 렌더링 시 계산)
    paddles: paddleInfos,
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 120, y: 100 }, // 속도 4배 증가
    paused: isPaused, // 일시정지 상태 전달
    onPlayerOut: (sideIndex) => {
      setLastOutSide(sideIndex)
      setIsPaused(true) // 게임 일시정지
      handlePlayerOut(sideIndex)
    },
    onPaddleHit: (sideIndex) => {
      console.log(`HIT on Side ${sideIndex}`)
    },
  })

  // 게임 재시작 시 렌더러 초기화
  const handleRestart = useCallback(() => {
    // 기존 렌더러들 완전히 제거
    if (polygonRendererRef.current) {
      polygonRendererRef.current.destroy()
      polygonRendererRef.current = null
    }
    if (outZoneRendererRef.current) {
      outZoneRendererRef.current.destroy()
      outZoneRendererRef.current = null
    }
    if (paddleRendererRef.current) {
      paddleRendererRef.current.destroy()
      paddleRendererRef.current = null
    }
    if (ballRendererRef.current) {
      ballRendererRef.current.destroy()
      ballRendererRef.current = null
    }
    if (arenaContainerRef.current) {
      arenaContainerRef.current.removeChildren()
      arenaContainerRef.current.destroy()
      arenaContainerRef.current = null
    }

    setLastOutSide(null)
    setIsPaused(false) // 일시정지 해제
    resetBall() // 공 초기화
    restartGame()
  }, [restartGame, resetBall])

  const handleRender = useCallback(
    (app: Application) => {
      // 첫 렌더링: 컨테이너와 렌더러 생성
      if (!arenaContainerRef.current) {
        const arenaContainer = new Container()
        app.stage.addChild(arenaContainer)
        arenaContainerRef.current = arenaContainer

        // 화면 중앙 배치
        arenaContainer.x = app.screen.width / 2
        arenaContainer.y = app.screen.height / 2

        // Arena 반지름 계산
        const radius = Math.min(app.screen.width, app.screen.height) * 0.38

        // 정N각형 렌더러 생성
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
        polygonRendererRef.current = polygonRenderer

        // OUT 존 렌더러 생성
        const outZoneRenderer = new OutZoneRenderer({
          n: playerCount,
          radius,
          thickness: 30,
          outSideIndex: lastOutSide ?? undefined,
        })
        arenaContainer.addChild(outZoneRenderer.getContainer())
        outZoneRendererRef.current = outZoneRenderer

        // 패들 렌더러 생성
        const paddleData = Array.from({ length: playerCount }, (_, i) => ({
          sideIndex: i,
          position: i === myPlayerIndex ? myPaddlePosition : 0,
          color: getPlayerColor(i),
          isMe: i === myPlayerIndex,
        }))
        const paddleRenderer = new PaddleRenderer({
          n: playerCount,
          radius,
          paddles: paddleData,
        })
        arenaContainer.addChild(paddleRenderer.getContainer())
        paddleRendererRef.current = paddleRenderer

        // 공 렌더러 생성
        const ballRenderer = new BallRenderer({
          position: ballPosition,
          arenaRadius: radius,
          trail: ballTrail,
          hitEffectActive,
        })
        arenaContainer.addChild(ballRenderer.getContainer())
        ballRendererRef.current = ballRenderer

        // 회전 적용
        const rotation = getArenaRotationForMyPlayer(myPlayerIndex, playerCount)
        arenaContainer.rotation = degToRad(rotation)

        console.log(
          `[Arena] 초기화 N=${playerCount}, myIndex=${myPlayerIndex}, rotation=${rotation.toFixed(1)}°`
        )
      } else {
        // 이후 렌더링: 렌더러 업데이트만
        const arenaContainer = arenaContainerRef.current
        const radius = Math.min(app.screen.width, app.screen.height) * 0.38

        // 화면 중앙 재배치 (리사이즈 대응)
        arenaContainer.x = app.screen.width / 2
        arenaContainer.y = app.screen.height / 2

        // OUT 존 업데이트
        if (outZoneRendererRef.current) {
          outZoneRendererRef.current.update({
            outSideIndex: lastOutSide ?? undefined,
            radius,
          })
        }

        // 패들 업데이트
        if (paddleRendererRef.current) {
          const paddleData = Array.from({ length: playerCount }, (_, i) => ({
            sideIndex: i,
            position: i === myPlayerIndex ? myPaddlePosition : 0,
            color: getPlayerColor(i),
            isMe: i === myPlayerIndex,
          }))
          paddleRendererRef.current.update({ paddles: paddleData, radius })
        }

        // 공 업데이트
        if (ballRendererRef.current) {
          ballRendererRef.current.update({
            position: ballPosition,
            arenaRadius: radius,
            trail: ballTrail,
            hitEffectActive,
          })
        }

        // playerCount 변경 시 전체 재생성 필요
        if (
          polygonRendererRef.current &&
          (polygonRendererRef.current as any).options.n !== playerCount
        ) {
          // 모든 렌더러 제거
          polygonRendererRef.current.destroy()
          outZoneRendererRef.current?.destroy()
          paddleRendererRef.current?.destroy()
          ballRendererRef.current?.destroy()
          arenaContainer.removeChildren()

          // 재생성
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
          polygonRendererRef.current = polygonRenderer

          const outZoneRenderer = new OutZoneRenderer({
            n: playerCount,
            radius,
            thickness: 30,
            outSideIndex: lastOutSide ?? undefined,
          })
          arenaContainer.addChild(outZoneRenderer.getContainer())
          outZoneRendererRef.current = outZoneRenderer

          const paddleData = Array.from({ length: playerCount }, (_, i) => ({
            sideIndex: i,
            position: i === myPlayerIndex ? myPaddlePosition : 0,
            color: getPlayerColor(i),
            isMe: i === myPlayerIndex,
          }))
          const paddleRenderer = new PaddleRenderer({
            n: playerCount,
            radius,
            paddles: paddleData,
          })
          arenaContainer.addChild(paddleRenderer.getContainer())
          paddleRendererRef.current = paddleRenderer

          const ballRenderer = new BallRenderer({
            position: ballPosition,
            arenaRadius: radius,
            trail: ballTrail,
            hitEffectActive,
          })
          arenaContainer.addChild(ballRenderer.getContainer())
          ballRendererRef.current = ballRenderer

          // 회전 재적용
          const rotation = getArenaRotationForMyPlayer(myPlayerIndex, playerCount)
          arenaContainer.rotation = degToRad(rotation)

          console.log(
            `[Arena] 재생성 N=${playerCount}, myIndex=${myPlayerIndex}, rotation=${rotation.toFixed(1)}°`
          )
        }
      }
    },
    [playerCount, myPlayerIndex, alivePlayers, myPaddlePosition, ballPosition, ballTrail, hitEffectActive, lastOutSide]
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
        <div className="flex items-center justify-center gap-4 flex-wrap">
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
          {lastOutSide !== null && (
            <div className="text-base animate-pulse bg-red-600 px-4 py-2 rounded-lg">
              <span className="font-bold text-white">
                🚨 OUT! Side {lastOutSide} ({alivePlayers.find((_, i) => i === lastOutSide)?.nickname || `Player${lastOutSide + 1}`})
              </span>
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
                      if (n !== initialPlayerCount) {
                        handleRestart()
                        // 렌더러 초기화 후 플레이어 수 변경
                        setTimeout(() => setInitialPlayerCount(n), 50)
                      }
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
          {(gameStatus === 'FINISHED' || gameStatus === 'PLAYING') && (
            <button
              onClick={handleRestart}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
            >
              🔄 다시 시작
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
