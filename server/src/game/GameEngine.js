/**
 * Base GameEngine class
 * This abstract class defines the interface that all game engines must implement
 */
class GameEngine {
  /**
   * Create a new game engine
   * @param {Object} config - Configuration for the game
   */
  constructor(config = {}) {
    this.config = config;
    this.type = 'abstract'; // Should be overridden by subclasses
  }
  
  /**
   * Initialize a new game state
   * @param {Array} players - Array of player objects
   * @returns {Object} Initial game state
   */
  initializeGame(players) {
    throw new Error("Must be implemented by subclass");
  }
  
  /**
   * Process a move and return updated game state
   * @param {Object} gameState - Current game state
   * @param {Object} move - Move to process
   * @param {string} playerId - ID of player making the move
   * @returns {Object} Result object with updated game state or error
   */
  processMove(gameState, move, playerId) {
    throw new Error("Must be implemented by subclass");
  }
  
  /**
   * Check if the game is over
   * @param {Object} gameState - Current game state
   * @returns {Object} Result with winner and win details if game is over, null otherwise
   */
  checkGameOver(gameState) {
    throw new Error("Must be implemented by subclass");
  }
  
  /**
   * Get valid moves for a player
   * @param {Object} gameState - Current game state
   * @param {string} playerId - ID of player
   * @returns {Array} Array of valid moves
   */
  getValidMoves(gameState, playerId) {
    throw new Error("Must be implemented by subclass");
  }
  
  /**
   * Validate if a move is legal
   * @param {Object} gameState - Current game state
   * @param {Object} move - Move to validate
   * @param {string} playerId - ID of player making the move
   * @returns {boolean} True if move is valid, false otherwise
   */
  isValidMove(gameState, move, playerId) {
    throw new Error("Must be implemented by subclass");
  }
  
  /**
   * Get the next player's turn
   * @param {Object} gameState - Current game state
   * @param {string} currentPlayerId - ID of current player
   * @returns {string} ID of next player
   */
  getNextTurn(gameState, currentPlayerId) {
    throw new Error("Must be implemented by subclass");
  }
}

module.exports = GameEngine;
