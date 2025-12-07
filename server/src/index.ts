/**
 * PolyPang Server - 진입점
 *
 * Express + Socket.io 서버
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

// Socket 핸들러
import { setupPolyPangHandlers, getRoomsList, getActiveGames } from './socket/polypangHandlers';

// 환경 변수 로드
dotenv.config();

// Express 앱 생성
const app = express();
const server = http.createServer(app);

// CORS 설정
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  })
);

app.use(express.json());

// Socket.IO 초기화
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// ==================== HTTP 엔드포인트 ====================

/**
 * Health check
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API 정보
 */
app.get('/api/info', (_req, res) => {
  res.json({
    name: 'PolyPang Server',
    version: '1.0.0',
    status: 'running',
    game: 'PolyPang - 정N각형 핀볼 생존 게임',
  });
});

/**
 * 전체 Room 목록 (디버깅용)
 */
app.get('/api/rooms', (_req, res) => {
  res.json({
    rooms: getRoomsList(),
  });
});

/**
 * 활성 게임 목록 (디버깅용)
 */
app.get('/api/games', (_req, res) => {
  res.json({
    games: getActiveGames(),
  });
});

// 프로덕션: 정적 파일 서빙
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist', 'index.html'));
  });
}

// ==================== Socket.IO ====================

io.on('connection', (socket) => {
  // PolyPang 핸들러 설정
  setupPolyPangHandlers(io, socket);
});

// ==================== 서버 시작 ====================

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🎮 PolyPang Server`);
  console.log('='.repeat(50));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || '*'}`);
  console.log('='.repeat(50));
  console.log(`✅ Server is ready!`);
  console.log('='.repeat(50));
});

// ==================== Graceful Shutdown ====================

process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// 처리되지 않은 Promise rejection 처리
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
