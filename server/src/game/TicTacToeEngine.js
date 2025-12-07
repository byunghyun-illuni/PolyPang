const GameEngine = require('./GameEngine');

/**
 * TicTacToe game engine implementation
 */
class TicTacToeEngine extends GameEngine {
  constructor(config = {}) {
    super({
      boardSize: 3,
      winCondition: 3,
      ...config
    });
    this.type = 'tic-tac-toe';
  }
  
  /**
   * Initialize a new Tic-tac-toe game
   * @param {Array} players - Array of player objects
   * @returns {Object} Initial game state
   */
  initializeGame(players) {
    if (players.length !== 2) {
      throw new Error('Tic-tac-toe requires exactly 2 players');
    }
    
    const boardSize = this.config.boardSize || 3;
    
    return {
      type: this.type,
      board: Array(boardSize * boardSize).fill(null),
      players: players.map((player, index) => ({
        ...player,
        symbol: index === 0 ? 'X' : 'O'
      })),
      currentTurn: players[0].userId, // First player starts
      status: 'playing',
      winner: null,
      winningLine: null,
      startedAt: new Date().toISOString()
    };
  }
  
  /**
   * Process a move in the Tic-tac-toe game
   * @param {Object} gameState - Current game state
   * @param {Object} move - Move to process (position on the board)
   * @param {string} playerId - ID of player making the move
   * @returns {Object} Result object with updated game state or error
   */
  processMove(gameState, move, playerId) {
    // Validate game status
    if (gameState.status !== 'playing') {
      return { error: 'Game is not active' };
    }
    
    // Validate turn
    if (gameState.currentTurn !== playerId) {
      return { error: 'Not your turn' };
    }
    
    // Validate move
    const { position } = move;
    if (!this.isValidMove(gameState, move, playerId)) {
      return { error: 'Invalid move' };
    }
    
    // Find player symbol
    const player = gameState.players.find(p => p.userId === playerId);
    if (!player) {
      return { error: 'Player not found' };
    }
    
    // Clone game state to avoid mutations
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Update board
    updatedState.board[position] = player.symbol;
    
    // Check for win
    const gameOverResult = this.checkGameOver(updatedState);
    if (gameOverResult.winner) {
      updatedState.status = 'finished';
      updatedState.winner = playerId;
      updatedState.winningLine = gameOverResult.line;
    } 
    // Check for draw
    else if (!updatedState.board.includes(null)) {
      updatedState.status = 'finished';
      updatedState.winner = 'draw';
    } 
    // Switch turns
    else {
      updatedState.currentTurn = this.getNextTurn(updatedState, playerId);
    }
    
    return { success: true, gameState: updatedState };
  }
  
  /**
   * Check if the game is over
   * @param {Object} gameState - Current game state
   * @returns {Object} Result with winner and winning line if game is over
   */
  checkGameOver(gameState) {
    const { board } = gameState;
    const size = this.config.boardSize || 3;
    const winCondition = this.config.winCondition || 3;
    
    // Check rows
    for (let row = 0; row < size; row++) {
      for (let col = 0; col <= size - winCondition; col++) {
        const line = [];
        let symbol = null;
        let isWinningLine = true;
        
        for (let i = 0; i < winCondition; i++) {
          const index = row * size + (col + i);
          line.push(index);
          
          if (i === 0) {
            symbol = board[index];
          } else if (board[index] !== symbol || symbol === null) {
            isWinningLine = false;
            break;
          }
        }
        
        if (isWinningLine && symbol) {
          return { winner: symbol, line };
        }
      }
    }
    
    // Check columns
    for (let col = 0; col < size; col++) {
      for (let row = 0; row <= size - winCondition; row++) {
        const line = [];
        let symbol = null;
        let isWinningLine = true;
        
        for (let i = 0; i < winCondition; i++) {
          const index = (row + i) * size + col;
          line.push(index);
          
          if (i === 0) {
            symbol = board[index];
          } else if (board[index] !== symbol || symbol === null) {
            isWinningLine = false;
            break;
          }
        }
        
        if (isWinningLine && symbol) {
          return { winner: symbol, line };
        }
      }
    }
    
    // Check diagonals (top-left to bottom-right)
    for (let row = 0; row <= size - winCondition; row++) {
      for (let col = 0; col <= size - winCondition; col++) {
        const line = [];
        let symbol = null;
        let isWinningLine = true;
        
        for (let i = 0; i < winCondition; i++) {
          const index = (row + i) * size + (col + i);
          line.push(index);
          
          if (i === 0) {
            symbol = board[index];
          } else if (board[index] !== symbol || symbol === null) {
            isWinningLine = false;
            break;
          }
        }
        
        if (isWinningLine && symbol) {
          return { winner: symbol, line };
        }
      }
    }
    
    // Check diagonals (top-right to bottom-left)
    for (let row = 0; row <= size - winCondition; row++) {
      for (let col = winCondition - 1; col < size; col++) {
        const line = [];
        let symbol = null;
        let isWinningLine = true;
        
        for (let i = 0; i < winCondition; i++) {
          const index = (row + i) * size + (col - i);
          line.push(index);
          
          if (i === 0) {
            symbol = board[index];
          } else if (board[index] !== symbol || symbol === null) {
            isWinningLine = false;
            break;
          }
        }
        
        if (isWinningLine && symbol) {
          return { winner: symbol, line };
        }
      }
    }
    
    return { winner: null, line: null };
  }
  
  /**
   * Get valid moves for a player
   * @param {Object} gameState - Current game state
   * @param {string} playerId - ID of player
   * @returns {Array} Array of valid moves
   */
  getValidMoves(gameState, playerId) {
    if (gameState.currentTurn !== playerId || gameState.status !== 'playing') {
      return [];
    }
    
    return gameState.board
      .map((cell, index) => cell === null ? { position: index } : null)
      .filter(move => move !== null);
  }
  
  /**
   * Validate if a move is legal
   * @param {Object} gameState - Current game state
   * @param {Object} move - Move to validate
   * @param {string} playerId - ID of player making the move
   * @returns {boolean} True if move is valid, false otherwise
   */
  isValidMove(gameState, move, playerId) {
    const { position } = move;
    const { board } = gameState;
    
    // Check if position is within bounds
    if (position < 0 || position >= board.length) {
      return false;
    }
    
    // Check if position is empty
    if (board[position] !== null) {
      return false;
    }
    
    // Check if it's the player's turn
    if (gameState.currentTurn !== playerId) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get the next player's turn
   * @param {Object} gameState - Current game state
   * @param {string} currentPlayerId - ID of current player
   * @returns {string} ID of next player
   */
  getNextTurn(gameState, currentPlayerId) {
    const nextPlayer = gameState.players.find(p => p.userId !== currentPlayerId);
    return nextPlayer ? nextPlayer.userId : currentPlayerId;
  }
}

module.exports = TicTacToeEngine;
