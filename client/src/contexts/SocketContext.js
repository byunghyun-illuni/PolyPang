import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, login } = useAuth();
  
  useEffect(() => {
    // Get the server URL from environment variables or use default
    // localhost가 아니면 같은 origin 사용 (배포 환경)
    const serverUrl = import.meta.env.VITE_SERVER_URL ||
      (window.location.hostname.includes('localhost') ? 'http://localhost:3001' : window.location.origin);
    
    // Create socket connection
    const socketConnection = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        sessionId: localStorage.getItem('sessionId')
      }
    });
    
    // Set up event listeners
    socketConnection.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });
    
    socketConnection.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });
    
    socketConnection.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });
    
    // Handle session
    socketConnection.on('session', ({ sessionId, userId }) => {
      console.log('Received session from server:', { sessionId, userId });
      // Store sessionId in localStorage for reconnection
      localStorage.setItem('sessionId', sessionId);
      socketConnection.auth = { sessionId };
      
      // Update user object with the server-assigned userId
      const storedUser = localStorage.getItem('gameUser');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          if (userObj && !userObj.userId) {
            userObj.userId = userId;
            localStorage.setItem('gameUser', JSON.stringify(userObj));
            // Update the auth context
            if (login && userObj.username) {
              login(userObj.username, userId);
            }
          }
        } catch (error) {
          console.error('Failed to update stored user with userId:', error);
        }
      }
    });
    
    // Save socket instance
    setSocket(socketConnection);
    
    // Cleanup on unmount
    return () => {
      socketConnection.disconnect();
    };
  }, []);
  
  // Register user when auth changes
  useEffect(() => {
    if (socket && user && user.username) {
      socket.emit('register', { username: user.username }, (response) => {
        if (response.error) {
          console.error('Registration error:', response.error);
        } else if (response.success) {
          console.log('Registration successful:', response);
          // Update user with server-assigned userId if needed
          if (response.userId && (!user.userId || user.userId !== response.userId)) {
            console.log('Updating user with server-assigned userId:', response.userId);
            login(user.username, response.userId);
          }
        }
      });
    }
  }, [socket, user, login]);
  
  // Socket context value
  const value = {
    socket,
    connected,
    
    // Helper method to emit events with Promise wrapper
    emitWithAck: (event, data) => {
      return new Promise((resolve, reject) => {
        if (!socket) {
          reject(new Error('Socket not connected'));
          return;
        }
        
        socket.emit(event, data, (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    }
  };
  
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
