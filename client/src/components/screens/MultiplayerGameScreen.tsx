/**
 * 멀티플레이 게임 화면
 *
 * ArenaTestScreen과 동일한 UI/UX 유지
 * 서버에서 받은 게임 상태를 렌더링하고, 입력을 서버에 전송
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Application, Container } from 'pixi.js'
import { useSocket } from '@/hooks/useSocket'
import { useGameStore } from '@/stores/gameStore'
import { useArenaInput } from '@/hooks/useArenaInput'
import ArenaCanvas from '@/components/arena/ArenaCanvas'
import { PolygonRenderer } from '@/components/arena/renderers/PolygonRenderer'
import { PaddleRenderer } from '@/components/arena/renderers/PaddleRenderer'
import { BallRenderer } from '@/components/arena/renderers/BallRenderer'
import TouchInputArea from '@/components/ui/TouchInputArea'
import { getArenaRotationForMyPlayer, degToRad } from '@/physics/geometry'
import { getPlayerColor } from '@/utils/colors'
import type { GameState, Player, PlayerRanking } from '@/types'
import { PaddleDirection } from '@/types'

export default function MultiplayerGameScreen() {
  const navigate = useNavigate()
  const { roomCode } = useParams<{ roomCode: string }>()
  const { socket } = useSocket()
  const { room, gameState, myUserId, updateGameState } = useGameStore()

  const [arenaRadius, setArenaRadius] = useState(150)
  const [gameResult, setGameResult] = useState<{ winner: Player; ranking: PlayerRanking[] } | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null) // 카운트다운 (3, 2, 1, null)
  const [showFinalEffect, setShowFinalEffect] = useState(false) // 1:1 결승 이펙트

  // 패들 위치 상태 (서버에서 받은 값)
  const paddlePositionsRef = useRef<Map<string, number>>(new Map())

  // OUT 연출 상태 (Arena 스냅샷 유지)
  const [outPhase, setOutPhase] = useState<{
    active: boolean
    outUserId: string
    outSideIndex: number
    outPlayerName: string
    snapshotN: number // OUT 시점의 Arena N
    ballPosition: { x: number; y: number }
    remainingPlayers: number
    isMe: boolean // 내가 OUT 됐는지
    isVictory: boolean // 우승인지
  } | null>(null)

  // 렌더러 참조
  const arenaContainerRef = useRef<Container | null>(null)
  const polygonRendererRef = useRef<PolygonRenderer | null>(null)
  const paddleRendererRef = useRef<PaddleRenderer | null>(null)
  const ballRendererRef = useRef<BallRenderer | null>(null)
  const lastDirectionRef = useRef<PaddleDirection>(PaddleDirection.STOP)

  // 공 위치/Trail 상태 (렌더링용)
  const ballPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const ballTrailRef = useRef<Array<{ x: number; y: number }>>([])
  const [hitEffectActive, setHitEffectActive] = useState(false)

  // 입력 처리
  const { direction: rawDirection, isTouching, handleTouchStart, handleTouchEnd } = useArenaInput()

  // 내 플레이어 정보
  const myPlayer = room?.players.find((p) => p.userId === myUserId)
  const alivePlayers = gameState?.alivePlayers ?? []
  // gameState.alivePlayers는 sideIndex 순서대로 정렬됨
  const myPlayerIndex = alivePlayers.indexOf(myUserId ?? '')
  const isAlive = myPlayerIndex >= 0
  const playerCount = gameState?.arena?.n ?? 8

  // Arena 회전은 handleRender에서 계산 (playerCount 변경 대응)

  // Arena 회전 때문에 입력 방향 반전
  const direction = rawDirection === 'LEFT' ? 'RIGHT' : rawDirection === 'RIGHT' ? 'LEFT' : 'NONE'

  // 생존 플레이어 목록 (표시용)
  const alivePlayersList = useMemo(() => {
    if (!room?.players || !alivePlayers) return []
    return room.players.filter(p => alivePlayers.includes(p.userId))
  }, [room?.players, alivePlayers])

  // 입력을 서버로 전송
  useEffect(() => {
    if (!socket || !isAlive) return

    const paddleDir =
      direction === 'LEFT' ? PaddleDirection.LEFT :
      direction === 'RIGHT' ? PaddleDirection.RIGHT :
      PaddleDirection.STOP

    // 방향이 바뀌었을 때만 전송
    if (paddleDir !== lastDirectionRef.current) {
      lastDirectionRef.current = paddleDir
      socket.emit('paddle_move', { direction: paddleDir })
    }
  }, [socket, direction, isAlive])

  // Socket 이벤트 리스너
  useEffect(() => {
    if (!socket) {
      console.log('[Game] Socket not available yet')
      return
    }
    console.log('[Game] Registering event listeners, socket.id:', socket.id, 'connected:', socket.connected)

    // 게임 상태 업데이트 (ball + paddles)
    const handleGameStateUpdate = (update: any) => {
      // 첫 몇 번만 로그
      if (update.tick <= 3) {
        console.log('[Game] game_state_update received, tick:', update.tick, 'ball:', update.ball?.position)
      }
      if (update.ball) {
        // Ball 위치 업데이트
        const scaledX = update.ball.position.x * arenaRadius
        const scaledY = update.ball.position.y * arenaRadius
        ballPositionRef.current = { x: scaledX, y: scaledY }

        // Trail 업데이트
        const trail = ballTrailRef.current
        trail.push({ x: scaledX, y: scaledY })
        if (trail.length > 10) trail.shift()

        updateGameState({ ball: { ...gameState?.ball, ...update.ball } } as Partial<GameState>)
      }

      // 패들 위치 업데이트
      if (update.paddles) {
        for (const paddle of update.paddles) {
          paddlePositionsRef.current.set(paddle.playerId, paddle.position)
        }
      }
    }

    const handlePaddleUpdate = (data: { userId: string; paddle: any }) => {
      // 개별 패들 업데이트 (방향 변경 시)
      if (data.paddle?.position !== undefined) {
        paddlePositionsRef.current.set(data.userId, data.paddle.position)
      }
    }

    // Hit Pang 이벤트 - 패들 히트 시각 효과
    const handleHitPang = (data: {
      playerId: string
      sideIndex: number
      paddleOffset?: number
    }) => {
      console.log('[Game] Hit Pang:', data)
      setHitEffectActive(true)
      setTimeout(() => setHitEffectActive(false), 100)

      // PaddleRenderer에 히트 이펙트 표시
      if (paddleRendererRef.current && data.paddleOffset !== undefined) {
        paddleRendererRef.current.showHitEffect(data.sideIndex, data.paddleOffset)
      }
    }

    // OUT Pang 이벤트 - OUT 연출 시작 (Arena 스냅샷 유지)
    const handleOutPang = (data: {
      userId: string
      sideIndex: number
      ballPosition: { x: number; y: number }
      currentN: number
      outDuration: number
    }) => {
      const player = room?.players.find(p => p.userId === data.userId)
      const isMe = data.userId === myUserId
      const isVictory = data.currentN === 2 && !isMe // 1:1에서 상대가 OUT = 우승

      console.log('[Game] OUT Pang:', player?.nickname || data.userId, 'Side:', data.sideIndex, 'isMe:', isMe, 'isVictory:', isVictory)

      setOutPhase({
        active: true,
        outUserId: data.userId,
        outSideIndex: data.sideIndex,
        outPlayerName: player?.nickname || 'Player',
        snapshotN: data.currentN,
        ballPosition: data.ballPosition,
        remainingPlayers: data.currentN - 1,
        isMe,
        isVictory,
      })
    }

    // Arena 리메시 시작 - 이제 Arena 업데이트
    const handleArenaRemeshStart = (data: {
      newArena: GameState['arena']
      newBall: GameState['ball']
      newPaddles: any[]
    }) => {
      console.log('[Game] Arena remesh start:', data.newArena.n)

      // OUT 연출 종료
      setOutPhase(null)

      // 새 패들 위치 초기화
      paddlePositionsRef.current.clear()
      data.newPaddles.forEach(p => {
        paddlePositionsRef.current.set(p.playerId, p.position)
      })

      // Ball 위치 리셋
      ballPositionRef.current = {
        x: data.newBall.position.x * arenaRadius,
        y: data.newBall.position.y * arenaRadius
      }
      ballTrailRef.current = []

      // 새 Arena, Ball, Paddles로 업데이트
      const paddlesMap: Record<string, any> = {}
      data.newPaddles.forEach(p => {
        paddlesMap[p.playerId] = p
      })

      updateGameState({
        arena: data.newArena,
        ball: data.newBall,
        paddles: paddlesMap,
        alivePlayers: data.newArena.sides.map((s: any) => s.playerId).filter(Boolean),
      } as Partial<GameState>)

      // 1:1 결승 이펙트
      if (data.newArena.n === 2) {
        setShowFinalEffect(true)
        setTimeout(() => {
          setShowFinalEffect(false)
          setCountdown(3)
        }, 2000)
      } else {
        // 일반 카운트다운
        setCountdown(3)
      }
    }

    // Arena 리메시 완료 - 게임 재개
    const handleArenaRemeshComplete = (data: { outPlayerId: string }) => {
      console.log('[Game] Arena remesh complete, out player:', data.outPlayerId)
    }

    const handleGameOver = (data: { winner: Player; ranking: PlayerRanking[] }) => {
      console.log('[Game] Game over! Winner:', data.winner.nickname)
      setGameResult(data)
    }

    socket.on('game_state_update', handleGameStateUpdate)
    socket.on('paddle_update', handlePaddleUpdate)
    socket.on('hit_pang', handleHitPang)
    socket.on('out_pang', handleOutPang)
    socket.on('arena_remesh_start', handleArenaRemeshStart)
    socket.on('arena_remesh_complete', handleArenaRemeshComplete)
    socket.on('game_over', handleGameOver)

    return () => {
      socket.off('game_state_update', handleGameStateUpdate)
      socket.off('paddle_update', handlePaddleUpdate)
      socket.off('hit_pang', handleHitPang)
      socket.off('out_pang', handleOutPang)
      socket.off('arena_remesh_start', handleArenaRemeshStart)
      socket.off('arena_remesh_complete', handleArenaRemeshComplete)
      socket.off('game_over', handleGameOver)
    }
  }, [socket, room, myUserId]) // gameState, updateGameState, arenaRadius 제거 - 무한 루프 방지

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
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [countdown])

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

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupRenderers()
    }
  }, [cleanupRenderers])

  // 매 프레임 렌더링 (ArenaTestScreen과 동일한 구조)
  const handleRender = useCallback(
    (app: Application) => {
      if (!gameState) return

      const displayN = outPhase?.snapshotN ?? playerCount

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
        setArenaRadius(radius)

        // 회전 각도 계산
        const rotation = getArenaRotationForMyPlayer(myPlayerIndex, displayN)

        // 플레이어 정보 매핑
        const players = room?.players.map((p) => ({
          nickname: p.nickname,
          userId: p.userId,
        })) ?? []

        // 정N각형 렌더러 생성
        const polygonRenderer = new PolygonRenderer({
          n: displayN,
          radius,
          players,
          myPlayerIndex,
          arenaRotation: rotation,
        })
        arenaContainer.addChild(polygonRenderer.getContainer())
        polygonRendererRef.current = polygonRenderer

        // 패들 렌더러 생성
        const paddleData = Array.from({ length: displayN }, (_, i) => ({
          sideIndex: i,
          position: paddlePositionsRef.current.get(alivePlayers[i]) ?? 0,
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
          position: ballPositionRef.current,
          arenaRadius: radius,
          trail: ballTrailRef.current,
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

        // 패들 업데이트 (서버에서 받은 위치 사용)
        if (paddleRendererRef.current) {
          const paddleData = Array.from({ length: displayN }, (_, i) => {
            const playerId = alivePlayers[i]
            return {
              sideIndex: i,
              position: paddlePositionsRef.current.get(playerId) ?? 0,
              color: getPlayerColor(i),
              isMe: playerId === myUserId,
            }
          })
          paddleRendererRef.current.update({ paddles: paddleData, radius })
        }

        // 공 업데이트
        if (ballRendererRef.current) {
          ballRendererRef.current.update({
            position: ballPositionRef.current,
            arenaRadius: radius,
            trail: ballTrailRef.current,
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

          const players = room?.players.map((p) => ({
            nickname: p.nickname,
            userId: p.userId,
          })) ?? []

          const polygonRenderer = new PolygonRenderer({
            n: displayN,
            radius,
            players,
            myPlayerIndex,
            arenaRotation: rotation,
          })
          arenaContainer.addChild(polygonRenderer.getContainer())
          polygonRendererRef.current = polygonRenderer

          const paddleData = Array.from({ length: displayN }, (_, i) => {
            const playerId = alivePlayers[i]
            return {
              sideIndex: i,
              position: paddlePositionsRef.current.get(playerId) ?? 0,
              color: getPlayerColor(i),
              isMe: playerId === myUserId,
            }
          })
          const paddleRenderer = new PaddleRenderer({
            n: displayN,
            radius,
            paddles: paddleData,
          })
          arenaContainer.addChild(paddleRenderer.getContainer())
          paddleRendererRef.current = paddleRenderer

          const ballRenderer = new BallRenderer({
            position: ballPositionRef.current,
            arenaRadius: radius,
            trail: ballTrailRef.current,
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
    [gameState, playerCount, outPhase, myPlayerIndex, room, arenaRadius, alivePlayers, myUserId, hitEffectActive]
  )

  // 게임 결과 화면
  if (gameResult) {
    const isWinner = gameResult.winner.userId === myUserId
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-4">
        <div className="text-5xl mb-4">{isWinner ? '🏆' : '💀'}</div>
        <h1 className={`text-3xl font-bold mb-4 ${isWinner ? 'text-yellow-400' : 'text-red-400'}`}>
          {isWinner ? 'VICTORY!' : 'GAME OVER'}
        </h1>
        <p className="text-xl mb-8">
          Winner: <span className="text-yellow-400 font-bold">{gameResult.winner.nickname}</span>
        </p>

        <div className="w-full max-w-sm space-y-2 mb-8">
          {gameResult.ranking.map((r) => (
            <div
              key={r.player.userId}
              className={`flex items-center justify-between p-3 rounded-lg ${
                r.player.userId === myUserId ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-yellow-400">#{r.rank}</span>
                <span>{r.player.nickname}</span>
                {r.player.userId === myUserId && <span className="text-xs text-yellow-400">(나)</span>}
              </div>
              <span className="text-gray-400 text-sm">{r.survivalTime.toFixed(1)}s</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 active:scale-95 transition-all"
        >
          로비로 돌아가기
        </button>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <p>게임 로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* 헤더 (6%) */}
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between" style={{ height: '6%' }}>
        <div className="text-lg font-bold">PolyPang</div>
        <div className="flex items-center gap-3">
          <span className="text-sm">
            <span className="text-green-400 font-bold">{alivePlayers.length}</span>명
          </span>
          <span className="text-xs text-gray-500">{roomCode}</span>
        </div>
      </div>

      {/* 생존자 표시 (4%) */}
      <div className="bg-gray-850 px-4 py-1 flex items-center justify-center gap-2" style={{ height: '4%', backgroundColor: '#1a1a2e' }}>
        {alivePlayersList.map((p) => (
          <div
            key={p.userId}
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              p.userId === myUserId
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
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(0,0,0,0.9) 70%)',
                animation: 'pulse 0.5s ease-in-out infinite'
              }}
            />
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
              <div className="flex items-center justify-center gap-6 mt-4">
                <div
                  className="text-3xl font-bold text-yellow-300"
                  style={{ textShadow: '0 0 10px rgba(253,224,71,0.8)' }}
                >
                  {myPlayer?.nickname || 'YOU'}
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
                  {alivePlayersList.find(p => p.userId !== myUserId)?.nickname || 'P2'}
                </div>
              </div>
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
        {outPhase && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className={`text-center p-6 rounded-xl ${outPhase.isMe ? 'bg-red-600' : outPhase.isVictory ? 'bg-gradient-to-b from-yellow-400 to-yellow-600' : 'bg-blue-600'}`}>
              {outPhase.isMe ? (
                <>
                  <div className="text-4xl mb-2">💥</div>
                  <div className="text-2xl font-bold text-white">OUT!</div>
                  <div className="text-sm text-white/80 mt-1">관전 모드...</div>
                </>
              ) : outPhase.isVictory ? (
                <>
                  <div className="text-5xl mb-3">🏆</div>
                  <div className="text-3xl font-bold text-white mb-1" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    VICTORY!
                  </div>
                  <div className="text-sm text-white/90 mb-4">{outPhase.snapshotN}명 중 1등!</div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">💨</div>
                  <div className="text-2xl font-bold text-white">{outPhase.outPlayerName} OUT!</div>
                  <div className="text-sm text-white/80 mt-1">{outPhase.remainingPlayers}명 남음</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 내가 OUT 됐을 때 (진행 중인 게임 관전) */}
        {!isAlive && !outPhase && !gameResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-300 mb-2">👀 관전 중</p>
              <p className="text-sm text-gray-500">{alivePlayers.length}명 남음</p>
            </div>
          </div>
        )}
      </div>

      {/* 조작 영역 (38%) */}
      <div style={{ height: '38%' }}>
        {isAlive ? (
          <TouchInputArea
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            isTouching={isTouching}
            touchingDirection={direction}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-800/50">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">관전 중...</p>
              <p className="text-xs">다음 라운드를 기다려주세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
