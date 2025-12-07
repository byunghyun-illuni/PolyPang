import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
`;

const Logo = styled.div`
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: var(--primary-color);
`;

const LoginForm = styled.form`
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
`;

const Title = styled.h1`
  margin-bottom: 1.5rem;
`;

const ErrorMessage = styled.div`
  background-color: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
`;

const Footer = styled.footer`
  margin-top: 2rem;
  font-size: 0.9rem;
  color: #6c757d;
`;

function Home() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // If already authenticated, redirect to lobby
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/lobby');
    }
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    try {
      login(username);
      navigate('/lobby');
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <HomeContainer>
      <Logo>🎮 Multiplayer Game</Logo>
      
      <LoginForm onSubmit={handleSubmit}>
        <Title>Welcome!</Title>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <div className="form-group">
          <label htmlFor="username">Enter your username to start playing:</label>
          <input
            type="text"
            id="username"
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            autoFocus
          />
        </div>
        
        <button type="submit" className="btn" style={{ width: '100%' }}>
          Start Playing
        </button>
      </LoginForm>
      
      <Footer>
        <p>A Railway template for multiplayer games</p>
        <p>Built with React, Node.js, and Socket.IO</p>
      </Footer>
    </HomeContainer>
  );
}

export default Home;
