const TicTacToeEngine = require('./TicTacToeEngine');

/**
 * Game Registry - Manages available game engines
 */
class GameRegistry {
  constructor() {
    this.engines = new Map();
    this.configs = new Map();
    
    // Register default games
    this.registerGame('tic-tac-toe', TicTacToeEngine, {
      displayName: 'Tic-tac-toe',
      description: 'Classic 3x3 tic-tac-toe game',
      minPlayers: 2,
      maxPlayers: 2,
      boardSize: 3,
      winCondition: 3
    });
  }
  
  /**
   * Register a new game type
   * @param {string} gameType - Unique identifier for the game
   * @param {Class} engineClass - Game engine class
   * @param {Object} config - Default configuration for the game
   */
  registerGame(gameType, engineClass, config = {}) {
    if (this.engines.has(gameType)) {
      throw new Error(`Game type '${gameType}' is already registered`);
    }
    
    this.engines.set(gameType, engineClass);
    this.configs.set(gameType, {
      ...config,
      type: gameType
    });
  }
  
  /**
   * Create a new game engine instance
   * @param {string} gameType - Type of game to create
   * @param {Object} config - Optional configuration overrides
   * @returns {GameEngine} Game engine instance
   */
  createGameEngine(gameType, config = {}) {
    const EngineClass = this.engines.get(gameType);
    
    if (!EngineClass) {
      throw new Error(`Unknown game type: ${gameType}`);
    }
    
    const defaultConfig = this.configs.get(gameType) || {};
    return new EngineClass({
      ...defaultConfig,
      ...config
    });
  }
  
  /**
   * Get configuration for a game type
   * @param {string} gameType - Type of game
   * @returns {Object} Game configuration
   */
  getGameConfig(gameType) {
    return this.configs.get(gameType);
  }
  
  /**
   * Get all available game types
   * @returns {Array} Array of game type objects with metadata
   */
  getAvailableGames() {
    return Array.from(this.configs.values());
  }
  
  /**
   * Get all available game types in a format suitable for the client
   * @returns {Array} Array of game type objects with id and name
   */
  getAvailableGameTypes() {
    return Array.from(this.configs.entries()).map(([id, config]) => ({
      id,
      name: config.displayName || id,
      description: config.description || '',
      minPlayers: config.minPlayers,
      maxPlayers: config.maxPlayers
    }));
  }
}

// Create and export singleton instance
const gameRegistry = new GameRegistry();
module.exports = gameRegistry;
