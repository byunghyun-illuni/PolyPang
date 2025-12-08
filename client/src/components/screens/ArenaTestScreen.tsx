/**
 * Arena 솔로 플레이 화면
 *
 * 기능:
 * - 8명으로 시작, 나(Player1)만 조작 가능
 * - OUT되면 자동으로 N-1명으로 재시작 (8→7→6→...→2)
 * - 2명에서 우승하면 다시 8명으로 리셋
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Application, Container } from 'pixi.js'
import ArenaCanvas from '@/components/arena/ArenaCanvas'
import { PolygonRenderer } from '@/components/arena/renderers/PolygonRenderer'
import { PaddleRenderer } from '@/components/arena/renderers/PaddleRenderer'
import { BallRenderer } from '@/components/arena/renderers/BallRenderer'
import TouchInputArea from '@/components/ui/TouchInputArea'
import { getArenaRotationForMyPlayer, degToRad } from '@/physics/geometry'
import { getPlayerColor } from '@/utils/colors'
import { GAME_CONSTANTS } from '@/utils/constants'
import { useArenaInput } from '@/hooks/useArenaInput'
import { usePaddlePhysics } from '@/hooks/usePaddlePhysics'
import { useBallPhysics } from '@/hooks/useBallPhysics'
import { useGameState } from '@/hooks/useGameState'

const INITIAL_PLAYER_COUNT = 8 // 항상 8명으로 시작
const AUTO_RESTART_DELAY = 800 // OUT 후 자동 재시작 딜레이 (ms)

export default function ArenaTestScreen() {
  const [currentPlayerCount, setCurrentPlayerCount] = useState(INITIAL_PLAYER_COUNT)
  const [lastOutSide, setLastOutSide] = useState<number | null>(null)
  const [lastOutPlayerName, setLastOutPlayerName] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(true) // 처음에 일시정지 상태로 시작
  const [showOutMessage, setShowOutMessage] = useState(false)
  const [snapshotN, setSnapshotN] = useState<number | null>(null) // OUT 연출 중 Arena N 고정
  const [arenaRadius, setArenaRadius] = useState(150) // 실제 렌더링 radius (동적 업데이트)
  const [countdown, setCountdown] = useState<number | null>(null) // 카운트다운 (3, 2, 1, null)
  const [showFinalEffect, setShowFinalEffect] = useState(false) // 1:1 결승 이펙트

  // 플레이어 목록 (currentPlayerCount 변경 시마다 재생성)
  const initialPlayers = useMemo(
    () =>
      Array.from({ length: currentPlayerCount }, (_, i) => ({
        id: `player-${i}`,
        nickname: `P${i + 1}`,
      })),
    [currentPlayerCount]
  )

  // 게임 상태 관리
  const {
    gameStatus,
    alivePlayers,
    playerCount,
    myPlayerIndex,
    winner: _winner,
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
  const paddleRendererRef = useRef<PaddleRenderer | null>(null)
  const ballRendererRef = useRef<BallRenderer | null>(null)

  // 입력 처리
  const { direction: rawDirection, isTouching, handleTouchStart, handleTouchEnd } =
    useArenaInput()

  // Arena가 180도 회전되므로 입력 방향 반전
  const direction = rawDirection === 'LEFT' ? 'RIGHT' : rawDirection === 'RIGHT' ? 'LEFT' : 'NONE'

  // 내 패들 물리
  const { position: myPaddlePosition } = usePaddlePhysics({
    direction: direction as 'LEFT' | 'RIGHT' | 'NONE',
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

  // 초기 속도 (currentPlayerCount 변경 시마다 랜덤 방향으로 재생성)
  const initialVelocity = useMemo(() => {
    const speed = GAME_CONSTANTS.BALL_FIRST_TURN_SPEED

    if (currentPlayerCount === 2) {
      // 1:1 모드: 상하(패들 방향)로만 시작 - 좌우 벽으로 가면 루즈해짐
      // 상단 또는 하단 방향 + 약간의 x변위
      const goingUp = Math.random() > 0.5
      const xVariation = (Math.random() - 0.5) * 0.6 // -0.3 ~ 0.3
      return {
        x: speed * xVariation,
        y: goingUp ? -speed * 0.9 : speed * 0.9
      }
    }

    // N≥3: 완전 랜덤
    const angle = Math.random() * Math.PI * 2
    return {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    }
  }, [currentPlayerCount]) // 플레이어 수 변경 시 새 방향

  // 공 물리 (arenaRadius는 렌더링에서 계산된 실제 값 사용)
  const {
    position: ballPosition,
    trail: ballTrail,
    hitEffectActive,
    reset: resetBall,
  } = useBallPhysics({
    playerCount,
    arenaRadius, // 실제 렌더링 radius 사용
    paddles: paddleInfos,
    initialPosition: { x: 0, y: 0 },
    initialVelocity, // 첫 턴 랜덤 방향, 느린 속도
    paused: isPaused, // 일시정지 상태 전달
    onPlayerOut: (sideIndex) => {
      const outPlayer = alivePlayers[sideIndex]
      setLastOutSide(sideIndex)
      setLastOutPlayerName(outPlayer?.nickname || `P${sideIndex + 1}`)
      setSnapshotN(playerCount) // 현재 N을 스냅샷으로 저장 (OUT 연출 중 유지)
      setShowOutMessage(true)
      setIsPaused(true)
      // handlePlayerOut은 OUT 연출 후에 호출 (AUTO_RESTART_DELAY 후)
    },
    onPaddleHit: (sideIndex, paddleOffset) => {
      console.log(`HIT on Side ${sideIndex}, offset: ${paddleOffset}`)
      // 히트 이펙트 표시
      if (paddleRendererRef.current) {
        // N=2일 때 sideIndex 변환 (0→0, 1→2)
        const actualSideIndex = playerCount === 2 ? (sideIndex === 0 ? 0 : 2) : sideIndex
        paddleRendererRef.current.showHitEffect(actualSideIndex, paddleOffset)
      }
    },
  })

  // 우승 여부: 2명 남은 상태(1:1)에서 상대가 OUT되면 우승
  // lastOutSide !== 0 = 내가 아닌 다른 플레이어가 OUT
  // playerCount === 2 = 1:1 상태였음 (OUT 처리 전)
  const isVictory = playerCount === 2 && lastOutSide !== null && lastOutSide !== 0

  // OUT 후 자동 재시작 로직 (우승 시에는 자동 재시작 안함)
  useEffect(() => {
    if (!showOutMessage || lastOutSide === null) return

    // 우승 시에는 자동 재시작 안함 - 버튼 클릭 대기
    if (isVictory) return

    const timer = setTimeout(() => {
      // 1. OUT 연출 종료
      setShowOutMessage(false)
      setSnapshotN(null)

      // 2. 실제로 플레이어 OUT 처리
      handlePlayerOut(lastOutSide)

      // 3. 내가 OUT된 경우 (sideIndex 0)
      const wasMyOut = lastOutSide === 0

      // 약간의 딜레이 후 재시작 (상태 업데이트 반영)
      setTimeout(() => {
        if (wasMyOut) {
          // 내가 OUT: 같은 인원수로 재시작
          handleAutoRestart(currentPlayerCount)
        } else {
          // 다른 플레이어 OUT: N-1로 계속
          handleAutoRestart(playerCount - 1)
        }
      }, 100)
    }, AUTO_RESTART_DELAY)

    return () => clearTimeout(timer)
  }, [showOutMessage, lastOutSide, playerCount, currentPlayerCount, isVictory, handlePlayerOut])

  // 자동 재시작 처리
  const handleAutoRestart = useCallback((newPlayerCount: number) => {
    // 렌더러 정리
    cleanupRenderers()

    // 상태 리셋
    setLastOutSide(null)
    setLastOutPlayerName(null)
    setIsPaused(true)
    resetBall()

    // 플레이어 수 변경 및 게임 재시작
    setCurrentPlayerCount(newPlayerCount)
    restartGame()

    // 1:1 결승 시 특별 이펙트
    if (newPlayerCount === 2) {
      setShowFinalEffect(true)
      setTimeout(() => {
        setShowFinalEffect(false)
        startGame()
        setCountdown(3)
      }, 2000) // 2초간 FINAL 이펙트 표시
    } else {
      // 일반 카운트다운 시작
      setTimeout(() => {
        startGame()
        setCountdown(3)
      }, 100)
    }
  }, [resetBall, restartGame, startGame])

  // 렌더러 정리 함수
  const cleanupRenderers = useCallback(() => {
    if (polygonRendererRef.current) {
      polygonRendererRef.current.destroy()
      polygonRendererRef.current = null
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
  }, [])

  // 수동 게임 재시작 (8명으로 리셋)
  const handleFullRestart = useCallback(() => {
    cleanupRenderers()
    setLastOutSide(null)
    setLastOutPlayerName(null)
    setShowOutMessage(false)
    setIsPaused(true)
    resetBall()
    setCurrentPlayerCount(INITIAL_PLAYER_COUNT)
    restartGame()
    setTimeout(() => {
      startGame()
      setCountdown(3)
    }, 100)
  }, [cleanupRenderers, resetBall, restartGame, startGame])

  // 카운트다운 시작 함수
  const startCountdown = useCallback(() => {
    setIsPaused(true)
    setCountdown(3)
  }, [])

  // 카운트다운 로직
  useEffect(() => {
    if (countdown === null) return

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // 카운트다운 종료 (0 = "GO!")
      const timer = setTimeout(() => {
        setCountdown(null)
        setIsPaused(false) // 게임 시작!
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 컴포넌트 마운트 시 카운트다운으로 게임 시작
  useEffect(() => {
    if (gameStatus === 'LOBBY') {
      startGame()
      startCountdown()
    }
  }, [])

  // OUT 연출 중에는 snapshotN 사용, 아니면 실제 playerCount 사용
  const displayN = snapshotN ?? playerCount
  const displayPlayers = snapshotN ? alivePlayers : alivePlayers // snapshotN 있으면 현재 alivePlayers 유지

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

        // Arena 반지름 계산 및 물리 엔진과 동기화
        const radius = Math.min(app.screen.width, app.screen.height) * 0.38
        setArenaRadius(radius)

        // 정N각형 렌더러 생성
        // 회전 각도 계산
        const rotation = getArenaRotationForMyPlayer(myPlayerIndex, displayN)

        const polygonRenderer = new PolygonRenderer({
          n: displayN,
          radius,
          players: displayPlayers.map((p) => ({
            userId: p.id,
            nickname: p.nickname,
          })),
          myPlayerIndex,
          arenaRotation: rotation, // 라벨 역회전용
        })
        arenaContainer.addChild(polygonRenderer.getContainer())
        polygonRendererRef.current = polygonRenderer

        // 패들 렌더러 생성
        const paddleData = Array.from({ length: displayN }, (_, i) => ({
          sideIndex: i,
          position: i === myPlayerIndex ? myPaddlePosition : 0,
          color: getPlayerColor(i),
          isMe: i === myPlayerIndex,
        }))
        const paddleRenderer = new PaddleRenderer({
          n: displayN,
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
        arenaContainer.rotation = degToRad(rotation)

        console.log(
          `[Arena] 초기화 N=${displayN}, myIndex=${myPlayerIndex}, rotation=${rotation.toFixed(1)}°`
        )
      } else {
        // 이후 렌더링: 렌더러 업데이트만
        const arenaContainer = arenaContainerRef.current
        const radius = Math.min(app.screen.width, app.screen.height) * 0.38

        // 물리 엔진과 radius 동기화 (리사이즈 대응)
        if (radius !== arenaRadius) {
          setArenaRadius(radius)
        }

        // 화면 중앙 재배치 (리사이즈 대응)
        arenaContainer.x = app.screen.width / 2
        arenaContainer.y = app.screen.height / 2

        // 패들 업데이트
        if (paddleRendererRef.current) {
          const paddleData = Array.from({ length: displayN }, (_, i) => ({
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

        // displayN 변경 시 전체 재생성 필요
        if (
          polygonRendererRef.current &&
          (polygonRendererRef.current as any).options.n !== displayN
        ) {
          // 모든 렌더러 제거
          polygonRendererRef.current.destroy()
          paddleRendererRef.current?.destroy()
          ballRendererRef.current?.destroy()
          arenaContainer.removeChildren()

          // 재생성
          const rotation = getArenaRotationForMyPlayer(myPlayerIndex, displayN)

          const polygonRenderer = new PolygonRenderer({
            n: displayN,
            radius,
            players: displayPlayers.map((p) => ({
              userId: p.id,
              nickname: p.nickname,
            })),
            myPlayerIndex,
            arenaRotation: rotation, // 라벨 역회전용
          })
          arenaContainer.addChild(polygonRenderer.getContainer())
          polygonRendererRef.current = polygonRenderer

          const paddleData = Array.from({ length: displayN }, (_, i) => ({
            sideIndex: i,
            position: i === myPlayerIndex ? myPaddlePosition : 0,
            color: getPlayerColor(i),
            isMe: i === myPlayerIndex,
          }))
          const paddleRenderer = new PaddleRenderer({
            n: displayN,
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
          arenaContainer.rotation = degToRad(rotation)

          console.log(
            `[Arena] 재생성 N=${displayN}, myIndex=${myPlayerIndex}, rotation=${rotation.toFixed(1)}°`
          )
        }
      }
    },
    [displayN, displayPlayers, myPlayerIndex, myPaddlePosition, ballPosition, ballTrail, hitEffectActive, arenaRadius]
  )

  // 내가 OUT됐는지 여부
  const isMyOut = lastOutSide === 0

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* 헤더 (6%) */}
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between" style={{ height: '6%' }}>
        <div className="text-lg font-bold">PolyPang</div>
        <div className="flex items-center gap-3">
          <span className="text-sm">
            <span className="text-green-400 font-bold">{playerCount}</span>명
          </span>
          <button
            onClick={handleFullRestart}
            className="px-3 py-1 bg-gray-700 text-sm rounded hover:bg-gray-600"
          >
            리셋
          </button>
        </div>
      </div>

      {/* 생존자 표시 (4%) */}
      <div className="bg-gray-850 px-4 py-1 flex items-center justify-center gap-2" style={{ height: '4%', backgroundColor: '#1a1a2e' }}>
        {alivePlayers.map((p) => (
          <div
            key={p.id}
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              p.id === 'player-0'
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {p.nickname}
          </div>
        ))}
      </div>

      {/* Arena 캔버스 (52%) */}
      <div className="relative" style={{ height: '52%' }}>
        <ArenaCanvas onRender={handleRender} />

        {/* 1:1 결승 FINAL 이펙트 */}
        {showFinalEffect && (
          <div className="absolute inset-0 flex items-center justify-center z-30 overflow-hidden">
            {/* 배경 플래시 */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(0,0,0,0.9) 70%)',
                animation: 'pulse 0.5s ease-in-out infinite'
              }}
            />

            {/* FINAL 텍스트 */}
            <div className="relative text-center">
              <div
                className="text-7xl font-black tracking-widest mb-4"
                style={{
                  color: '#FFD700',
                  textShadow: '0 0 20px #FFD700, 0 0 40px #FFA500, 0 0 60px #FF6600, 0 0 80px #FF0000',
                  animation: 'bounce 0.6s ease-in-out infinite'
                }}
              >
                FINAL
              </div>

              {/* VS 연출 */}
              <div className="flex items-center justify-center gap-6 mt-4">
                <div
                  className="text-3xl font-bold text-yellow-300"
                  style={{ textShadow: '0 0 10px rgba(253,224,71,0.8)' }}
                >
                  YOU
                </div>
                <div
                  className="text-4xl font-black text-red-500"
                  style={{
                    textShadow: '0 0 15px rgba(239,68,68,0.8)',
                    animation: 'pulse 0.3s ease-in-out infinite'
                  }}
                >
                  VS
                </div>
                <div
                  className="text-3xl font-bold text-blue-300"
                  style={{ textShadow: '0 0 10px rgba(147,197,253,0.8)' }}
                >
                  P2
                </div>
              </div>

              {/* 서브 텍스트 */}
              <div
                className="text-lg text-gray-300 mt-6 tracking-wide"
                style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
              >
                LAST ONE STANDING
              </div>
            </div>
          </div>
        )}

        {/* 카운트다운 오버레이 */}
        {countdown !== null && !showFinalEffect && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <div className="text-center">
              {countdown > 0 ? (
                <div
                  className="text-8xl font-bold text-white animate-pulse"
                  style={{
                    textShadow: '0 0 40px rgba(255,255,255,0.8), 0 0 80px rgba(59,130,246,0.6)',
                    animation: 'pulse 0.5s ease-in-out'
                  }}
                >
                  {countdown}
                </div>
              ) : (
                <div
                  className="text-6xl font-bold text-green-400"
                  style={{
                    textShadow: '0 0 40px rgba(74,222,128,0.8), 0 0 80px rgba(34,197,94,0.6)'
                  }}
                >
                  GO!
                </div>
              )}
            </div>
          </div>
        )}

        {/* OUT 메시지 오버레이 */}
        {showOutMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className={`text-center p-6 rounded-xl ${isMyOut ? 'bg-red-600' : isVictory ? 'bg-gradient-to-b from-yellow-400 to-yellow-600' : 'bg-blue-600'}`}>
              {isMyOut ? (
                <>
                  <div className="text-4xl mb-2">💥</div>
                  <div className="text-2xl font-bold text-white">OUT!</div>
                  <div className="text-sm text-white/80 mt-1">다시 도전...</div>
                </>
              ) : isVictory ? (
                <>
                  <div className="text-5xl mb-3">🏆</div>
                  <div className="text-3xl font-bold text-white mb-1" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    VICTORY!
                  </div>
                  <div className="text-sm text-white/90 mb-4">8명 중 1등!</div>
                  <button
                    onClick={() => {
                      setShowOutMessage(false)
                      handleAutoRestart(INITIAL_PLAYER_COUNT)
                    }}
                    className="px-6 py-3 bg-white text-yellow-600 font-bold rounded-lg shadow-lg hover:bg-yellow-50 active:scale-95 transition-all"
                  >
                    다시 시작
                  </button>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">💨</div>
                  <div className="text-2xl font-bold text-white">{lastOutPlayerName} OUT!</div>
                  <div className="text-sm text-white/80 mt-1">{playerCount - 1}명 남음</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 조작 영역 (38%) */}
      <div style={{ height: '38%' }}>
        <TouchInputArea
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          isTouching={isTouching}
          touchingDirection={direction}
        />
      </div>
    </div>
  )
}
