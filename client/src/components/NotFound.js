import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
`;

const ErrorCode = styled.h1`
  font-size: 6rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
`;

const Message = styled.p`
  font-size: 1.5rem;
  margin-bottom: 2rem;
`;

function NotFound() {
  return (
    <NotFoundContainer>
      <ErrorCode>404</ErrorCode>
      <Message>Oops! The page you're looking for doesn't exist.</Message>
      <Link to="/" className="btn">
        Go Home
      </Link>
    </NotFoundContainer>
  );
}

export default NotFound;
