/**
 * 멀티플레이 게임 화면
 *
 * 서버에서 받은 게임 상태를 렌더링하고, 입력을 서버에 전송
 */

import { useEffect, useRef, useState, useCallback } from 'react'
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
import type { GameState, Player, PlayerRanking } from '@/types'
import { PaddleDirection } from '@/types'

export default function MultiplayerGameScreen() {
  const navigate = useNavigate()
  const { roomCode } = useParams<{ roomCode: string }>()
  const { socket } = useSocket()
  const { room, gameState, myUserId, updateGameState } = useGameStore()

  const [arenaRadius, setArenaRadius] = useState(150)
  const [showOutMessage, setShowOutMessage] = useState<string | null>(null)
  const [gameResult, setGameResult] = useState<{ winner: Player; ranking: PlayerRanking[] } | null>(null)

  // 렌더러 참조
  const arenaContainerRef = useRef<Container | null>(null)
  const polygonRendererRef = useRef<PolygonRenderer | null>(null)
  const paddleRendererRef = useRef<PaddleRenderer | null>(null)
  const ballRendererRef = useRef<BallRenderer | null>(null)
  const lastDirectionRef = useRef<PaddleDirection>(PaddleDirection.STOP)

  // 입력 처리
  const { direction: rawDirection, handleTouchStart, handleTouchEnd } = useArenaInput()

  // 내 플레이어 정보
  const myPlayer = room?.players.find((p) => p.userId === myUserId)
  const myPlayerIndex = myPlayer?.sideIndex ?? 0
  const alivePlayers = gameState?.alivePlayers ?? []
  const isAlive = alivePlayers.includes(myUserId ?? '')

  // Arena 회전 (내 Side가 하단에 오도록)
  const arenaRotation = getArenaRotationForMyPlayer(myPlayerIndex, gameState?.arena?.n ?? 4)

  // Arena 회전 때문에 입력 방향 반전
  const direction = rawDirection === 'LEFT' ? 'RIGHT' : rawDirection === 'RIGHT' ? 'LEFT' : 'NONE'

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
    if (!socket) return

    const handleGameStateUpdate = (update: any) => {
      // 서버에서 ball 위치/속도만 업데이트로 전송
      if (update.ball) {
        updateGameState({ ball: { ...gameState?.ball, ...update.ball } } as Partial<GameState>)
      }
    }

    const handlePaddleUpdate = (data: { userId: string; paddle: any }) => {
      // 다른 플레이어의 패들 업데이트
      if (gameState?.paddles) {
        const updatedPaddles = { ...gameState.paddles }
        if (updatedPaddles[data.userId]) {
          updatedPaddles[data.userId] = { ...updatedPaddles[data.userId], ...data.paddle }
          updateGameState({ paddles: updatedPaddles } as Partial<GameState>)
        }
      }
    }

    const handlePlayerOut = (data: { userId: string; reason?: string }) => {
      const player = room?.players.find(p => p.userId === data.userId)
      console.log('[Game] Player out:', player?.nickname || data.userId)
      setShowOutMessage(`${player?.nickname || 'Player'} OUT!`)
      setTimeout(() => setShowOutMessage(null), 1500)
    }

    const handleArenaRemesh = (data: { arena: GameState['arena'] }) => {
      console.log('[Game] Arena remesh:', data.arena.n)
      updateGameState({ arena: data.arena })
    }

    const handleGameOver = (data: { winner: Player; ranking: PlayerRanking[] }) => {
      console.log('[Game] Game over! Winner:', data.winner.nickname)
      setGameResult(data)
    }

    socket.on('game_state_update', handleGameStateUpdate)
    socket.on('paddle_update', handlePaddleUpdate)
    socket.on('player_out', handlePlayerOut)
    socket.on('arena_remesh_complete', handleArenaRemesh)
    socket.on('game_over', handleGameOver)

    return () => {
      socket.off('game_state_update', handleGameStateUpdate)
      socket.off('paddle_update', handlePaddleUpdate)
      socket.off('player_out', handlePlayerOut)
      socket.off('arena_remesh_complete', handleArenaRemesh)
      socket.off('game_over', handleGameOver)
    }
  }, [socket, updateGameState, gameState, room])

  // PixiJS 초기화
  const initRenderers = useCallback(
    (app: Application) => {
      if (!gameState || arenaContainerRef.current) return

      const container = new Container()
      container.x = app.screen.width / 2
      container.y = app.screen.height / 2
      app.stage.addChild(container)
      arenaContainerRef.current = container

      // 실제 radius 계산
      const radius = Math.min(app.screen.width, app.screen.height) * 0.4
      setArenaRadius(radius)

      // Arena 회전 적용
      container.rotation = degToRad(arenaRotation)

      // 플레이어 정보 매핑
      const players = room?.players.map((p) => ({
        nickname: p.nickname,
        userId: p.userId,
      })) ?? []

      // Polygon 렌더러
      polygonRendererRef.current = new PolygonRenderer({
        n: gameState.arena.n,
        radius,
        players,
        myPlayerIndex,
        arenaRotation,
      })
      container.addChild(polygonRendererRef.current.getContainer())

      // Paddle 렌더러
      const paddleInfos = Object.values(gameState.paddles).map((p) => ({
        sideIndex: p.sideIndex,
        position: p.position,
        color: p.color,
        isMe: p.playerId === myUserId,
      }))
      paddleRendererRef.current = new PaddleRenderer({
        n: gameState.arena.n,
        radius,
        paddles: paddleInfos,
      })
      container.addChild(paddleRendererRef.current.getContainer())

      // Ball 렌더러
      const ballPos = {
        x: gameState.ball.position.x * radius,
        y: gameState.ball.position.y * radius,
      }
      ballRendererRef.current = new BallRenderer({
        position: ballPos,
        arenaRadius: radius,
        trail: [],
        hitEffectActive: false,
      })
      container.addChild(ballRendererRef.current.getContainer())
    },
    [gameState, room, myPlayerIndex, arenaRotation, myUserId]
  )

  // onRender 콜백 (매 프레임 호출)
  const handleRender = useCallback(
    (app: Application) => {
      // 첫 렌더 시 초기화
      initRenderers(app)
    },
    [initRenderers]
  )

  // 게임 상태 업데이트 시 렌더러 업데이트
  useEffect(() => {
    if (!gameState || !arenaContainerRef.current) return

    // Ball 업데이트
    if (ballRendererRef.current && gameState.ball) {
      const scaledPos = {
        x: gameState.ball.position.x * arenaRadius,
        y: gameState.ball.position.y * arenaRadius,
      }
      ballRendererRef.current.update({
        position: scaledPos,
        arenaRadius: arenaRadius,
      })
    }

    // Paddle 업데이트
    if (paddleRendererRef.current && gameState.paddles) {
      const paddleInfos = Object.values(gameState.paddles).map((p) => ({
        sideIndex: p.sideIndex,
        position: p.position,
        color: p.color,
        isMe: p.playerId === myUserId,
      }))
      paddleRendererRef.current.update({
        n: gameState.arena.n,
        radius: arenaRadius,
        paddles: paddleInfos,
      })
    }

    // Arena 변경 시 Polygon 업데이트
    if (polygonRendererRef.current) {
      const players = room?.players.map((p) => ({
        nickname: p.nickname,
        userId: p.userId,
      })) ?? []
      polygonRendererRef.current.update({
        n: gameState.arena.n,
        radius: arenaRadius,
        players,
        myPlayerIndex,
        arenaRotation,
      })
    }
  }, [gameState, arenaRadius, room, myPlayerIndex, arenaRotation, myUserId])

  // 게임 결과 화면
  if (gameResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-4">
        <h1 className="text-3xl font-bold text-yellow-400 mb-4">GAME OVER</h1>
        <p className="text-xl mb-8">
          Winner: <span className="text-yellow-400 font-bold">{gameResult.winner.nickname}</span>
        </p>

        <div className="w-full max-w-sm space-y-2 mb-8">
          {gameResult.ranking.map((r) => (
            <div
              key={r.player.userId}
              className={`flex items-center justify-between p-3 rounded-lg ${
                r.player.userId === myUserId ? 'bg-yellow-500/20' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-yellow-400">#{r.rank}</span>
                <span>{r.player.nickname}</span>
              </div>
              <span className="text-gray-400 text-sm">{r.survivalTime.toFixed(1)}s</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-lg"
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
      {/* 상단 정보 */}
      <div className="h-[10%] flex items-center justify-between px-4 text-white">
        <div className="text-sm">
          <span className="text-gray-400">생존:</span>{' '}
          <span className="text-yellow-400 font-bold">{alivePlayers.length}</span>
        </div>
        <div className="text-sm text-gray-400">
          {roomCode}
        </div>
      </div>

      {/* Arena */}
      <div className="h-[52%] relative">
        <ArenaCanvas onRender={handleRender} />

        {/* OUT 메시지 */}
        {showOutMessage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-4xl font-bold text-red-500 animate-pulse">
              {showOutMessage}
            </div>
          </div>
        )}

        {/* 내가 OUT 됐을 때 */}
        {!isAlive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400 mb-2">OUT!</p>
              <p className="text-gray-400">관전 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="h-[38%]">
        {isAlive ? (
          <TouchInputArea
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            관전 중...
          </div>
        )}
      </div>
    </div>
  )
}
