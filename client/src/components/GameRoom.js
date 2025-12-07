import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { getGameComponent } from './games';
import ChatBox from './ChatBox';

const GameRoomContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  height: calc(100vh - 40px);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 300px;
  }
`;

const GameSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
  margin-bottom: 20px;
`;

const GameInfo = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
  padding: 15px;
  margin-bottom: 20px;
`;

const GameBoardContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
  padding: 20px;
`;

const ChatSection = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const WaitingMessage = styled.div`
  text-align: center;
  padding: 40px;
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
  
  h2 {
    margin-bottom: 20px;
  }
`;

const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  
  .player-symbol {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    margin-right: 10px;
    font-weight: bold;
  }
  
  .player-x {
    background-color: #ff6b6b;
    color: white;
  }
  
  .player-o {
    background-color: #4dabf7;
    color: white;
  }
  
  .current-turn {
    font-weight: bold;
    color: var(--primary-color);
  }
`;

const GameOverModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const GameOverContent = styled.div`
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
  width: 100%;
  
  h2 {
    margin-bottom: 20px;
  }
  
  .buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
  }
`;

const GameStatus = styled.div`
  margin-top: 20px;
  font-size: 18px;
  font-weight: bold;
`;

const Button = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
`;

function GameRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket, emitWithAck } = useSocket();
  const { user } = useAuth();
  
  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  
  // Check authentication
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Join room on component mount
  useEffect(() => {
    let isMounted = true;
    let joinAttempted = false;
    
    const joinGameRoom = async () => {
      if (!socket || !roomId || joinAttempted) return;
      
      joinAttempted = true;
      
      try {
        console.log('Joining room:', roomId);
        const response = await emitWithAck('joinRoom', { roomId });
        console.log('Joined room:', response);
        
        if (isMounted) {
          setRoom(response.room);
          
          // If game is already in progress, set the game state
          if (response.game) {
            setGame(response.game);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          joinAttempted = false; // Allow retry if there was an error
        }
      }
    };
    
    joinGameRoom();
    
    // Clean up when leaving
    return () => {
      isMounted = false;
      if (socket && roomId) {
        socket.emit('leaveRoom', { roomId });
      }
    };
  }, [socket, roomId, emitWithAck]);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Player joined event
    socket.on('playerJoined', (data) => {
      console.log('Player joined event:', data);
      // If we receive the complete room object, use it
      if (data.room) {
        setRoom(data.room);
      } else {
        // Fallback to manually adding the player
        setRoom(prevRoom => {
          if (!prevRoom) return prevRoom;
          return {
            ...prevRoom,
            players: [...prevRoom.players, { userId: data.userId, username: data.username }]
          };
        });
      }
    });
    
    // Player left event
    socket.on('playerLeft', () => {
      console.log('Player left event');
      // We'll get updated room info from roomsList event
    });
    
    // Game started event
    socket.on('gameStarted', (gameState) => {
      console.log('Game started event:', gameState);
      setGame(gameState);
      setGameOver(false);
      setWinner(null);
    });
    
    // Game update event
    socket.on('gameUpdate', (gameState) => {
      console.log('Game update event:', gameState);
      setGame(gameState);
    });
    
    // Game over event
    socket.on('gameOver', ({ winner }) => {
      console.log('Game over event:', { winner });
      setGameOver(true);
      setWinner(winner);
    });
    
    // Game interrupted event
    socket.on('gameInterrupted', () => {
      console.log('Game interrupted event');
      setGame(prev => prev ? { ...prev, status: 'interrupted' } : null);
    });
    
    // Game restarted event
    socket.on('gameRestarted', () => {
      console.log('Game restarted event');
      setGameOver(false);
      setWinner(null);
      setGame(null);
    });
    
    // Game error event
    socket.on('gameError', (error) => {
      console.error('Game error event:', error);
    });
    
    // Chat message event
    socket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    // Clean up event listeners
    return () => {
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('gameStarted');
      socket.off('gameUpdate');
      socket.off('gameOver');
      socket.off('gameInterrupted');
      socket.off('gameRestarted');
      socket.off('gameError');
      socket.off('newMessage');
    };
  }, [socket]);
  
  const handleMove = (position) => {
    if (!game || game.status !== 'playing') return;
    
    if (game.currentTurn !== user?.userId) {
      console.log('Not your turn:', { 
        currentTurn: game.currentTurn, 
        yourId: user?.userId,
        players: game.players
      });
      return;
    }
    
    console.log('Making move:', { position, userId: user?.userId });
    socket.emit('gameMove', {
      roomId,
      move: { position }
    });
  };
  
  const handleSendMessage = (message) => {
    if (!socket || !message.trim()) return;
    
    socket.emit('sendMessage', {
      roomId,
      message: message.trim()
    });
  };
  
  const handleLeaveGame = () => {
    navigate('/lobby');
  };
  
  const handleRestartGame = async () => {
    try {
      // Use emitWithAck to provide a proper callback
      await emitWithAck('restartGame', { roomId });
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Determine if it's current player's turn
  const isPlayerTurn = () => {
    if (!game || !user) return false;
    console.log('Turn check:', { 
      currentTurn: game.currentTurn, 
      userId: user.userId, 
      isMyTurn: game.currentTurn === user.userId 
    });
    return game.currentTurn === user.userId;
  };
  
  // Get opponent player
  const getOpponent = () => {
    if (!game) return null;
    return game.players.find(p => p.userId !== user?.userId);
  };
  
  // Render game board or waiting message
  const renderGameBoard = () => {
    if (!room) {
      return <p>Loading room...</p>;
    }

    // Get the appropriate game component based on game type
    const gameType = room.gameType || 'tic-tac-toe';
    const GameComponent = getGameComponent(gameType);

    if (!GameComponent) {
      return <p>Unknown game type: {gameType}</p>;
    }

    if (game && game.status === 'playing') {
      return (
        <GameComponent
          game={game}
          onMove={handleMove}
          currentPlayer={user?.userId}
        />
      );
    }

    if (game && game.status === 'finished') {
      return (
        <div>
          <GameComponent
            game={game}
            currentPlayer={user?.userId}
          />
          <GameStatus>
            {game.winner === 'draw' ? 'Game ended in a draw!' : 
             game.winner === user?.userId ? 'You won!' : 'You lost!'}
          </GameStatus>
          {room.creatorId === user?.userId && (
            <Button onClick={handleRestartGame}>Play Again</Button>
          )}
        </div>
      );
    }

    return (
      <WaitingMessage>
        Waiting for another player to join...
      </WaitingMessage>
    );
  };
  
  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error}</div>
        <button className="btn" onClick={() => navigate('/lobby')}>
          Back to Lobby
        </button>
      </div>
    );
  }
  
  if (!room) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (room.status === 'waiting' && room.players.length < room.maxPlayers) {
    return (
      <WaitingMessage>
        <h2>Waiting for opponent...</h2>
        <p>Share this room ID with a friend: <strong>{roomId}</strong></p>
        <p>Players: {room.players.length}/{room.maxPlayers}</p>
        <button className="btn btn-secondary" onClick={handleLeaveGame}>
          Leave Room
        </button>
      </WaitingMessage>
    );
  }
  
  return (
    <GameRoomContainer>
      <GameSection>
        <GameHeader>
          <h2>{room.name}</h2>
          <button className="btn btn-secondary" onClick={handleLeaveGame}>
            Leave Game
          </button>
        </GameHeader>
        
        <GameInfo>
          {game && (
            <>
              <h3>Players</h3>
              {game.players.map(player => (
                <PlayerInfo key={player.userId}>
                  <div className={`player-symbol player-${player.symbol.toLowerCase()}`}>
                    {player.symbol}
                  </div>
                  <div className={game.currentTurn === player.userId ? 'current-turn' : ''}>
                    {player.username}
                    {game.currentTurn === player.userId && ' (Current Turn)'}
                    {player.userId === user?.userId && ' (You)'}
                  </div>
                </PlayerInfo>
              ))}
              
              <div style={{ marginTop: '10px' }}>
                {isPlayerTurn() ? (
                  <div className="alert alert-success">Your turn!</div>
                ) : (
                  <div>Waiting for opponent's move...</div>
                )}
              </div>
            </>
          )}
        </GameInfo>
        
        <GameBoardContainer>
          {renderGameBoard()}
        </GameBoardContainer>
      </GameSection>
      
      <ChatSection>
        <ChatBox 
          messages={messages}
          onSendMessage={handleSendMessage}
          currentUserId={user?.userId}
        />
      </ChatSection>
      
      {gameOver && (
        <GameOverModal>
          <GameOverContent>
            <h2>Game Over</h2>
            
            {winner === 'draw' ? (
              <p>It's a draw!</p>
            ) : winner === user?.userId ? (
              <p>You won! 🎉</p>
            ) : (
              <p>{getOpponent()?.username} won!</p>
            )}
            
            <div className="buttons">
              {room.creatorId === user?.userId && (
                <button className="btn" onClick={handleRestartGame}>
                  Play Again
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleLeaveGame}>
                Back to Lobby
              </button>
            </div>
          </GameOverContent>
        </GameOverModal>
      )}
    </GameRoomContainer>
  );
}

export default GameRoom;
