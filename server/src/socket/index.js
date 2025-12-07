const { v4: uuidv4 } = require('uuid');
const gameHandlers = require('./gameHandlers');
const gameRegistry = require('../game/GameRegistry');

// In-memory storage
const rooms = new Map();
const sessions = new Map();

/**
 * Setup Socket.IO event handlers
 * @param {Server} io - Socket.IO server instance
 */
function setupSocketHandlers(io) {
  // Middleware for session handling
  io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (sessionId) {
      // Reconnection logic
      const existingSession = sessions.get(sessionId);
      if (existingSession) {
        socket.sessionId = sessionId;
        socket.userId = existingSession.userId;
        socket.username = existingSession.username;
        console.log(`User reconnected: ${socket.username}, userId: ${socket.userId}`);
        return next();
      }
    }
    
    // New connection
    socket.sessionId = uuidv4();
    socket.userId = uuidv4();
    console.log(`New connection assigned userId: ${socket.userId}`);
    next();
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Send session details to the client
    socket.emit('session', {
      sessionId: socket.sessionId,
      userId: socket.userId
    });

    // Handle user registration
    socket.on('register', ({ username }, callback) => {
      if (!username || username.trim() === '') {
        return callback({ error: 'Username is required' });
      }
      
      socket.username = username.trim();
      
      // Save session
      sessions.set(socket.sessionId, {
        userId: socket.userId,
        username: socket.username
      });
      
      console.log(`User registered: ${socket.username}, userId: ${socket.userId}`);
      
      // Send session details back to client
      socket.emit('session', {
        sessionId: socket.sessionId,
        userId: socket.userId
      });
      
      callback({ 
        success: true,
        userId: socket.userId,
        username: socket.username
      });
    });  

    // Handle room creation
    socket.on('createRoom', ({ roomName, maxPlayers = 2, gameType = 'tic-tac-toe' }, callback) => {
      if (!socket.userId) {
        return callback({ error: 'User not registered' });
      }

      // Validate game type
      try {
        const gameConfig = gameRegistry.getGameConfig(gameType);
        if (!gameConfig) {
          return callback({ error: 'Invalid game type' });
        }
        
        // Use game config to validate maxPlayers
        if (maxPlayers < gameConfig.minPlayers || maxPlayers > gameConfig.maxPlayers) {
          maxPlayers = gameConfig.maxPlayers;
        }
      } catch (error) {
        console.error('Error validating game type:', error);
        return callback({ error: 'Invalid game type' });
      }

      const roomId = uuidv4();
      const room = {
        id: roomId,
        name: roomName,
        creatorId: socket.userId,
        players: [{ userId: socket.userId, username: socket.username }],
        maxPlayers,
        gameType,
        status: 'waiting',
        createdAt: new Date().toISOString()
      };

      rooms.set(roomId, room);
      socket.join(roomId);

      callback({ success: true, roomId });
      io.emit('roomsList', Array.from(rooms.values()));
    });

    // Handle getting rooms list
    socket.on('getRooms', (callback) => {
      callback(Array.from(rooms.values()));
    });
  
    // Handle getting available game types
    socket.on('getGameTypes', (callback) => {
      const gameTypes = gameRegistry.getAvailableGameTypes();
      callback(gameTypes);
    });

    // Handle joining a room
    socket.on('joinRoom', ({ roomId }, callback) => {
      if (!socket.userId) {
        return callback({ error: 'User not registered' });
      }

      const room = rooms.get(roomId);
      if (!room) {
        return callback({ error: 'Room not found' });
      }

      // Check if player is already in the room
      const playerIndex = room.players.findIndex(p => p.userId === socket.userId);
      if (playerIndex >= 0) {
        // Player is rejoining, update their socket ID
        socket.join(roomId);
        
        // If game is active, send current game state
        const game = gameHandlers.getActiveGame(roomId);
        if (game) {
          callback({ success: true, room, game });
        } else {
          callback({ success: true, room });
        }
        
        return;
      }

      // Check if room is full
      if (room.players.length >= room.maxPlayers) {
        return callback({ error: 'Room is full' });
      }

      // Add player to room
      room.players.push({ userId: socket.userId, username: socket.username });
      socket.join(roomId);

      // Notify room about new player
      io.to(roomId).emit('playerJoined', { 
        userId: socket.userId, 
        username: socket.username,
        room: room // Send the complete room object
      });

      // Update rooms list for everyone
      io.emit('roomsList', Array.from(rooms.values()));

      callback({ success: true, room });

      // Start game if room is full
      if (room.players.length === room.maxPlayers) {
        // Add small delay to ensure all clients process playerJoined event first
        setTimeout(() => {
          gameHandlers.startGame(io, roomId, rooms);
        }, 500);
      }
    });

    // Handle leaving a room
    socket.on('leaveRoom', ({ roomId }, callback) => {
      leaveRoom(socket, roomId);
      if (callback) callback({ success: true });
    });

    // Handle game moves
    socket.on('gameMove', ({ roomId, move }) => {
      // Process the move using the game handler
      const result = gameHandlers.processGameMove(io, roomId, move, socket.userId, rooms);
      
      // Handle errors
      if (result && result.error) {
        socket.emit('gameError', { message: result.error });
      }
    });

    // Handle chat messages
    socket.on('sendMessage', ({ roomId, message }) => {
      if (!socket.username || !message || message.trim() === '') return;
      
      const room = rooms.get(roomId);
      if (!room) return;
      
      const chatMessage = {
        id: uuidv4(),
        userId: socket.userId,
        username: socket.username,
        message: message.trim(),
        timestamp: new Date().toISOString()
      };
      
      io.to(roomId).emit('newMessage', chatMessage);
    });

    // Handle game restart request
    socket.on('restartGame', ({ roomId }, callback) => {
      const result = gameHandlers.restartGame(io, roomId, socket.userId, rooms);
      
      // Only call the callback if it's a function
      if (typeof callback === 'function') {
        if (result.error) {
          return callback({ error: result.error });
        }
        callback({ success: true });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      
      // Update user session
      if (socket.sessionId) {
        const session = sessions.get(socket.sessionId);
        if (session) {
          session.connected = false;
          // Keep session data for reconnection
          setTimeout(() => {
            // Clean up session if no reconnection after 1 hour
            if (!session.connected) {
              sessions.delete(socket.sessionId);
            }
          }, 60 * 60 * 1000);
        }
      }
      
      // Handle leaving all rooms
      for (const [roomId, room] of rooms.entries()) {
        if (room.players.some(player => player.userId === socket.userId)) {
          leaveRoom(socket, roomId);
        }
      }
    });
  });
}

/**
 * Handle a player leaving a room
 * @param {Socket} socket - Socket instance
 * @param {string} roomId - Room ID
 */
function leaveRoom(socket, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Remove player from room
  const playerIndex = room.players.findIndex(p => p.userId === socket.userId);
  if (playerIndex !== -1) {
    room.players.splice(playerIndex, 1);
  }

  socket.leave(roomId);

  // If room is empty, delete it
  if (room.players.length === 0) {
    rooms.delete(roomId);
    gameHandlers.cleanupGame(roomId);
  } 
  // If game was in progress, handle interruption
  else if (room.status === 'playing') {
    const game = gameHandlers.getActiveGame(roomId);
    if (game) {
      // Mark game as interrupted
      gameHandlers.processGameMove(socket, roomId, { type: 'interrupt' }, socket.userId, rooms);
      
      socket.to(roomId).emit('gameInterrupted', { 
        userId: socket.userId, 
        username: socket.username 
      });
    }
    room.status = 'waiting';
  }

  // Update room list
  socket.to(roomId).emit('roomsList', Array.from(rooms.values()));
}

module.exports = setupSocketHandlers;
