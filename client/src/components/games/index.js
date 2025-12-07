import TicTacToeBoard from './TicTacToeBoard';

/**
 * Game component registry
 * Maps game types to their respective React components
 */
const gameComponents = {
  'tic-tac-toe': TicTacToeBoard,
};

/**
 * Get the React component for a specific game type
 * @param {string} gameType - Type of game
 * @returns {React.Component|null} Game component or null if not found
 */
export function getGameComponent(gameType) {
  return gameComponents[gameType] || null;
}

/**
 * Register a new game component
 * @param {string} gameType - Type of game
 * @param {React.Component} component - React component for the game
 */
export function registerGameComponent(gameType, component) {
  gameComponents[gameType] = component;
}

/**
 * Get all available game components
 * @returns {Object} Object with game types as keys and components as values
 */
export function getAllGameComponents() {
  return { ...gameComponents };
}
