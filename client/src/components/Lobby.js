import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const LobbyContainer = styled.div`
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    
    h1 {
      margin-bottom: 10px;
    }
    
    div {
      width: 100%;
      display: flex;
      justify-content: space-between;
    }
  }
`;

const RoomsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const RoomCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
  overflow: hidden;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const RoomHeader = styled.div`
  background-color: var(--light-gray);
  padding: 15px;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RoomBody = styled.div`
  padding: 15px;
`;

const RoomFooter = styled.div`
  background-color: var(--light-gray);
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    margin: 0;
  }
  
  button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 4px;
  text-transform: uppercase;
  
  &.waiting {
    background-color: var(--warning-color);
    color: #212529;
  }
  
  &.playing {
    background-color: var(--success-color);
    color: white;
  }
  
  &.finished {
    background-color: var(--light-gray);
    color: #212529;
  }
`;

function Lobby() {
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedGameType, setSelectedGameType] = useState('tic-tac-toe');
  const [availableGameTypes, setAvailableGameTypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { socket, connected, emitWithAck } = useSocket();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Check authentication
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Get rooms list and available game types
  useEffect(() => {
    if (socket && connected) {
      // Initial rooms list
      socket.emit('getRooms', (roomsList) => {
        setRooms(roomsList);
        setLoading(false);
      });
      
      // Get available game types
      socket.emit('getGameTypes', (gameTypes) => {
        setAvailableGameTypes(gameTypes);
        if (gameTypes.length > 0) {
          setSelectedGameType(gameTypes[0].id);
        }
      });
      
      // Listen for rooms list updates
      socket.on('roomsList', (updatedRooms) => {
        setRooms(updatedRooms);
      });
      
      return () => {
        socket.off('roomsList');
      };
    }
  }, [socket, connected]);
  
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newRoomName.trim()) {
      setError('Room name is required');
      return;
    }
    
    try {
      const response = await emitWithAck('createRoom', { 
        roomName: newRoomName,
        gameType: selectedGameType
      });
      console.log('Room created:', response);
      setShowCreateModal(false);
      setNewRoomName('');
      navigate(`/game/${response.roomId}`);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleJoinRoom = async (roomId) => {
    try {
      await emitWithAck('joinRoom', { roomId });
      navigate(`/game/${roomId}`);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  return (
    <LobbyContainer>
      <Header>
        <h1>Game Lobby</h1>
        <div>
          <span>Welcome, <strong>{user?.username}</strong>!</span>
          <div style={{ marginLeft: '20px', display: 'inline-block' }}>
            <button className="btn" onClick={() => setShowCreateModal(true)}>Create Room</button>
            <button className="btn btn-secondary" style={{ marginLeft: '10px' }} onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </Header>
      
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      ) : rooms.length === 0 ? (
        <div className="container">
          <p>No game rooms available. Create one to start playing!</p>
        </div>
      ) : (
        <RoomsGrid>
          {rooms.map((room) => (
            <RoomCard key={room.id}>
              <RoomHeader>
                <div>{room.name}</div>
                <Badge className={room.status}>{room.status}</Badge>
              </RoomHeader>
              <RoomBody>
                <p>Created by: {room.createdBy}</p>
                <p>Game Type: {room.gameType || 'Tic-tac-toe'}</p>
                <p>Players: {room.players.length}/{room.maxPlayers}</p>
                <p>Created: {new Date(room.createdAt).toLocaleString()}</p>
              </RoomBody>
              <RoomFooter>
                <div>
                  {room.players.map((player, index) => (
                    <span key={player.userId} style={{ marginRight: '5px' }}>
                      {player.username}{index < room.players.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
                <button 
                  className="btn"
                  disabled={room.players.length >= room.maxPlayers || room.status !== 'waiting'}
                  onClick={() => handleJoinRoom(room.id)}
                >
                  {room.players.length >= room.maxPlayers ? 'Full' : 'Join'}
                </button>
              </RoomFooter>
            </RoomCard>
          ))}
        </RoomsGrid>
      )}
      
      {showCreateModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h2>Create New Room</h2>
              <button onClick={() => setShowCreateModal(false)}>&times;</button>
            </ModalHeader>
            
            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}
            
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label htmlFor="roomName">Room Name:</label>
                <input
                  type="text"
                  id="roomName"
                  className="form-control"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name"
                  required
                />
              </div>
              
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label htmlFor="gameType">Game Type:</label>
                <select
                  id="gameType"
                  className="form-control"
                  value={selectedGameType}
                  onChange={(e) => setSelectedGameType(e.target.value)}
                >
                  {availableGameTypes.length > 0 ? (
                    availableGameTypes.map(gameType => (
                      <option key={gameType.id} value={gameType.id}>
                        {gameType.name}
                      </option>
                    ))
                  ) : (
                    <option value="tic-tac-toe">Tic-tac-toe</option>
                  )}
                </select>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Create
                </button>
              </div>
            </form>
          </ModalContent>
        </Modal>
      )}
    </LobbyContainer>
  );
}

export default Lobby;
