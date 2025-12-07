# Multiplayer Game Template for Railway

A production-ready multiplayer game template that enables developers to quickly deploy and customize real-time multiplayer games using ReactJS, Node.js, and Socket.IO.

## Table of Contents
1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Getting Started](#getting-started)
4. [Creating Your Own Game](#creating-your-own-game)
5. [Deployment on Railway](#deployment-on-railway)
6. [Advanced Customization](#advanced-customization)
7. [Troubleshooting](#troubleshooting)
8. [File Structure Guide](#file-structure-guide)

## Features

### Current Version
- **Modular Game Engine**: Abstract base classes for game logic with easy extension
- **Dynamic Component Registry**: Frontend components are loaded based on game type
- **Game Server**: Node.js backend with Socket.IO for real-time communication
- **Game Client**: React-based frontend with responsive design
- **Room System**: Support for multiple concurrent game rooms
- **Basic Authentication**: Username-based login with session persistence
- **Game Lobby**: Room listing, creation, and joining functionality
- **In-Game Chat**: Text chat functionality within game rooms
- **Reconnection Logic**: Ability to rejoin ongoing games after disconnection
- **Turn-Based Gameplay**: Simple card/board game mechanics (Tic-tac-toe)

### Future Phases
- Enhanced authentication with user accounts
- Matchmaking system
- Game history and statistics
- Advanced game mechanics options
- Spectator mode
- Tournament functionality
- AI opponents
- Custom game creation with rule modifications

## Architecture Overview

The template follows a client-server architecture with clear separation of concerns:

### Backend Architecture

- **Game Engine Abstraction**: The `GameEngine` base class defines the interface for all game engines
- **Game Registry**: The `GameRegistry` manages game types and creates game engine instances
- **Socket Handlers**: Handle real-time communication between clients and server
- **Room Management**: Manages game rooms, players, and game state

### Frontend Architecture

- **React Components**: UI components for lobby, game room, and game boards
- **Context API**: Manages global state for authentication and socket connections
- **Game Component Registry**: Maps game types to their corresponding React components
- **Socket.IO Client**: Handles real-time communication with the server

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Git

### Deploy on Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/multiplayer-game)

### Local Development
1. Clone the repository
2. Install dependencies:
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```
3. Set up environment variables (copy `.env.example` to `.env` in both client and server directories)
4. Start the development servers:
   ```
   # Start server
   cd server
   npm run dev

   # Start client in another terminal
   cd client
   npm start
   ```
5. Open your browser and navigate to `http://localhost:3000`

## Creating Your Own Game

The template is designed to make it easy to add new games. Here's how to create your own game:

### 1. Create a Game Engine

1. Create a new file in `server/src/game/` (e.g., `MyGameEngine.js`)
2. Extend the `GameEngine` base class and implement required methods:

```javascript
const GameEngine = require('./GameEngine');

class MyGameEngine extends GameEngine {
  constructor(config = {}) {
    super({
      // Default configuration
      ...config
    });
    this.type = 'my-game'; // Unique identifier for your game
  }

  // Initialize a new game
  initializeGame(players) {
    // Create initial game state
    return {
      type: this.type,
      // Your game-specific state
      players: players.map((player, index) => ({
        ...player,
        // Add game-specific player properties
      })),
      currentTurn: players[0].userId,
      status: 'playing',
      // Other game-specific properties
      startedAt: new Date().toISOString()
    };
  }

  // Process a move
  processMove(gameState, move, playerId) {
    // Validate and process the move
    // Return updated game state
  }

  // Check if the game is over
  checkGameOver(gameState) {
    // Check win/loss conditions
    // Return winner information
  }

  // Get valid moves for a player
  getValidMoves(gameState, playerId) {
    // Return array of valid moves
  }

  // Validate a move
  isValidMove(gameState, move, playerId) {
    // Return true if move is valid
  }

  // Get the next player's turn
  getNextTurn(gameState, currentPlayerId) {
    // Return ID of next player
  }
}

module.exports = MyGameEngine;
```

### 2. Register Your Game Engine

Add your game engine to the `GameRegistry` in `server/src/game/GameRegistry.js`:

```javascript
// In the constructor
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
  
  // Register your game
  this.registerGame('my-game', MyGameEngine, {
    displayName: 'My Game',
    description: 'Description of my game',
    minPlayers: 2,
    maxPlayers: 4, // Adjust as needed
    // Game-specific configuration
  });
}
```

### 3. Create a Frontend Component

1. Create a new file in `client/src/components/games/` (e.g., `MyGameBoard.js`)
2. Implement your game board component:

```jsx
import React from 'react';
import styled from 'styled-components';

// Styled components for your game
const GameContainer = styled.div`
  // Your styling
`;

// Your game board component
const MyGameBoard = ({ game, onMove, currentPlayer }) => {
  // Game rendering and interaction logic
  
  const handleMove = (moveData) => {
    // Call onMove with move data
    onMove(moveData);
  };
  
  return (
    <GameContainer>
      {/* Your game UI */}
    </GameContainer>
  );
};

export default MyGameBoard;
```

### 4. Register Your Frontend Component

Add your component to the game component registry in `client/src/components/games/index.js`:

```javascript
import TicTacToeBoard from './TicTacToeBoard';
import MyGameBoard from './MyGameBoard';

/**
 * Game component registry
 * Maps game types to their respective React components
 */
const gameComponents = {
  'tic-tac-toe': TicTacToeBoard,
  'my-game': MyGameBoard,
};
```

### 5. Test Your Game

1. Start both the client and server
2. Create a new room with your game type
3. Join the room and test your game functionality

## Deployment on Railway

The template is configured for easy deployment on Railway:

1. Create a Railway account at [railway.app](https://railway.app)
2. Install the Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

3. Login to Railway:
   ```bash
   railway login
   ```

4. Initialize your project:
   ```bash
   railway init
   ```

5. Add environment variables in the Railway dashboard

6. Deploy your application:
   ```bash
   railway up
   ```

7. Open your deployed application:
   ```bash
   railway open
   ```

## Advanced Customization

### Customizing the Lobby

The Lobby component (`client/src/components/Lobby.js`) can be customized to add additional features:

- Game filtering
- Room search
- Private rooms
- Custom room settings

### Adding Authentication

The template uses a simple username-based authentication system. To add more robust authentication:

1. Modify the `AuthContext.js` file to integrate with your authentication provider
2. Update the server's session handling in `server/src/socket/index.js`
3. Add authentication middleware to protect routes

### Adding Persistence

The template uses in-memory storage for rooms and sessions. To add persistence:

1. Add a database connection (MongoDB, PostgreSQL, etc.)
2. Create models for rooms, games, and users
3. Update the socket handlers to use the database instead of in-memory maps

## Troubleshooting

### Common Issues

#### Socket Connection Issues

- Check that the server is running
- Verify that the client is connecting to the correct server URL
- Check for CORS issues in the server configuration
- Ensure environment variables are properly set

#### Game State Synchronization Issues

- Ensure that game state updates are properly broadcasted to all clients
- Check that the game engine is correctly processing moves
- Verify that the client is correctly handling game state updates
- Check for race conditions in socket event handling

#### Deployment Issues

- Check environment variables in Railway dashboard
- Verify that the build process is successful
- Check for port conflicts
- Review Railway logs for any errors

### Debugging Tips

- Use `console.log` statements to debug server-side issues
- Use React DevTools to inspect component state
- Check the browser console for client-side errors
- Use Socket.IO's debug mode to trace socket events

## File Structure Guide

Here's a guide to the key files in the template and whether they should be modified when creating your own game:

### Server Files

| File | Purpose | Modify? |
|------|---------|---------|
| `server/src/index.js` | Server entry point | No |
| `server/src/socket/index.js` | Socket.IO event handlers | No |
| `server/src/socket/gameHandlers.js` | Game event handlers | No |
| `server/src/game/GameEngine.js` | Base game engine class | No |
| `server/src/game/GameRegistry.js` | Game registry | Yes (to register new games) |
| `server/src/game/TicTacToeEngine.js` | Tic-tac-toe implementation | Use as reference |
| `server/src/game/YourGameEngine.js` | Your custom game | Create new |

### Client Files

| File | Purpose | Modify? |
|------|---------|---------|
| `client/src/App.js` | Main application component | No |
| `client/src/contexts/AuthContext.js` | Authentication context | No |
| `client/src/contexts/SocketContext.js` | Socket connection context | No |
| `client/src/components/Lobby.js` | Lobby component | No |
| `client/src/components/GameRoom.js` | Game room component | No |
| `client/src/components/ChatBox.js` | Chat component | No |
| `client/src/components/games/index.js` | Game component registry | Yes (to register new games) |
| `client/src/components/games/TicTacToeBoard.js` | Tic-tac-toe board component | Use as reference |
| `client/src/components/games/YourGameBoard.js` | Your custom game board | Create new |

## Project Structure

```
multiplayer-game-template/
├── client/                 # React frontend
│   ├── public/             # Static assets
│   └── src/                # Source code
│       ├── components/     # UI components
│       │   ├── games/      # Game-specific components
│       │   │   ├── index.js           # Game component registry
│       │   │   └── TicTacToeBoard.js  # Tic-tac-toe implementation
│       │   ├── ChatBox.js  # In-game chat component
│       │   ├── GameBoard.js # Generic game board wrapper
│       │   ├── GameRoom.js # Game room component
│       │   ├── Home.js     # Home/landing page
│       │   └── Lobby.js    # Game lobby component
│       ├── contexts/       # React contexts
│       │   ├── AuthContext.js  # Authentication context
│       │   └── SocketContext.js # Socket.IO context
│       ├── App.js         # Main application component
│       └── index.js       # Entry point
└── server/                 # Node.js backend
    └── src/
        ├── game/           # Game logic
        │   ├── GameEngine.js       # Abstract base class
        │   ├── GameRegistry.js     # Game type registry
        │   └── TicTacToeEngine.js  # Tic-tac-toe implementation
        ├── socket/         # Socket.IO handlers
        │   ├── gameHandlers.js     # Game-specific socket handlers
        │   └── index.js            # Main socket handler
        └── index.js        # Server entry point
```

## Developer Experience

The template is designed to provide an excellent developer experience:

- **Modular Architecture**: Clear separation of concerns makes it easy to understand and extend
- **Hot Reloading**: Changes to both client and server code are automatically reloaded during development
- **Typed Documentation**: Comprehensive JSDoc comments help understand the codebase
- **Consistent Patterns**: Similar patterns are used throughout the codebase for consistency
- **Error Handling**: Robust error handling with clear error messages
- **Responsive Design**: The UI works well on both desktop and mobile devices

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
