const { v4: uuidv4 } = require('uuid');
const gameRegistry = require('../game/GameRegistry');

// In-memory storage for active games
const activeGames = new Map();

/**
 * Start a new game in a room
 * @param {Server} io - Socket.IO server instance
 * @param {string} roomId - Room ID
 * @param {Map} rooms - Rooms map from main socket handler
 */
function startGame(io, roomId, rooms) {
  const room = rooms.get(roomId);
  
  if (!room || room.players.length < 2) return;
  
  // Make sure players array is properly formed with exactly 2 players
  const validPlayers = room.players.slice(0, room.maxPlayers);
  if (validPlayers.length < 2) {
    console.error('Cannot start game: need at least 2 players');
    return;
  }
  
  room.status = 'playing';
  
  try {
    // Create game engine based on room's gameType (default to tic-tac-toe if not specified)
    const gameType = room.gameType || 'tic-tac-toe';
    const gameEngine = gameRegistry.createGameEngine(gameType);
    
    // Initialize game state
    const gameState = gameEngine.initializeGame(validPlayers);
    
    console.log('Starting game:', {
      roomId,
      gameType,
      players: gameState.players.map(p => ({ userId: p.userId, username: p.username, symbol: p.symbol })),
      currentTurn: gameState.currentTurn
    });
    
    // Store game engine with the game state
    gameState._engine = gameEngine;
    activeGames.set(roomId, gameState);
    
    // Notify players that game has started
    io.to(roomId).emit('gameStarted', gameState);
  } catch (error) {
    console.error('Error starting game:', error);
    room.status = 'waiting';
    io.to(roomId).emit('gameError', { message: 'Failed to start game' });
  }
}

/**
 * Process a game move
 * @param {Server} io - Socket.IO server instance
 * @param {string} roomId - Room ID
 * @param {Object} move - Move details
 * @param {string} userId - User ID making the move
 * @param {Map} rooms - Rooms map from main socket handler
 */
function processGameMove(io, roomId, move, userId, rooms) {
  const gameState = activeGames.get(roomId);
  
  if (!gameState) {
    return { error: 'Game not found' };
  }
  
  // Get the game engine
  const gameEngine = gameState._engine;
  if (!gameEngine) {
    return { error: 'Game engine not found' };
  }
  
  // Process the move
  const result = gameEngine.processMove(gameState, move, userId);
  
  if (result.error) {
    return result;
  }
  
  // Update game state
  const updatedState = result.gameState;
  delete updatedState._engine; // Don't send engine to clients
  
  // Store updated game state with engine
  updatedState._engine = gameEngine;
  activeGames.set(roomId, updatedState);
  
  // Send update to clients
  io.to(roomId).emit('gameUpdate', updatedState);
  
  // Handle game over
  if (updatedState.status === 'finished') {
    io.to(roomId).emit('gameOver', {
      winner: updatedState.winner,
      winningLine: updatedState.winningLine
    });
    
    // Update room status
    const room = rooms.get(roomId);
    if (room) {
      room.status = 'finished';
      io.emit('roomsList', Array.from(rooms.values()));
    }
  }
  
  return { success: true };
}

/**
 * Restart a game
 * @param {Server} io - Socket.IO server instance
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID requesting restart
 * @param {Map} rooms - Rooms map from main socket handler
 */
function restartGame(io, roomId, userId, rooms) {
  const room = rooms.get(roomId);
  
  if (!room) {
    return { error: 'Room not found' };
  }
  
  if (room.creatorId !== userId) {
    return { error: 'Only the room creator can restart the game' };
  }
  
  if (room.status !== 'finished') {
    return { error: 'Can only restart finished games' };
  }
  
  // Reset room status
  room.status = 'waiting';
  
  // Remove old game
  activeGames.delete(roomId);
  
  // Notify players
  io.to(roomId).emit('gameRestarted', { roomId });
  
  // Start new game if enough players
  if (room.players.length >= 2) {
    setTimeout(() => {
      startGame(io, roomId, rooms);
    }, 500);
  }
  
  return { success: true };
}

/**
 * Get available game types
 * @returns {Array} Array of game types
 */
function getAvailableGameTypes() {
  return gameRegistry.getAvailableGames();
}

/**
 * Clean up game when a room is deleted
 * @param {string} roomId - Room ID
 */
function cleanupGame(roomId) {
  activeGames.delete(roomId);
}

/**
 * Get active game for a room
 * @param {string} roomId - Room ID
 * @returns {Object|null} Game state or null if not found
 */
function getActiveGame(roomId) {
  const gameState = activeGames.get(roomId);
  if (gameState) {
    // Create a copy without the engine
    const { _engine, ...gameCopy } = gameState;
    return gameCopy;
  }
  return null;
}

module.exports = {
  startGame,
  processGameMove,
  restartGame,
  getAvailableGameTypes,
  cleanupGame,
  getActiveGame
};
