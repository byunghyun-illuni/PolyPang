import React from 'react';
import styled from 'styled-components';

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
`;

const BoardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  aspect-ratio: 1 / 1;
`;

const Cell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.isWinning ? '#4caf5066' : '#f5f5f5'};
  border-radius: 8px;
  font-size: 2.5rem;
  font-weight: bold;
  cursor: ${props => props.onClick && !props.disabled ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  user-select: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background-color: ${props => props.onClick && !props.disabled ? '#e0e0e0' : props.isWinning ? '#4caf5066' : '#f5f5f5'};
  }
`;

const Symbol = styled.span`
  color: ${props => props.symbol === 'X' ? '#f44336' : '#2196f3'};
`;

/**
 * Tic-tac-toe game board component
 */
const TicTacToeBoard = ({ game, onMove, currentPlayer }) => {
  if (!game || !game.board) {
    return <div>Loading game...</div>;
  }
  
  const isPlayerTurn = game.currentTurn === currentPlayer;
  const isGameActive = game.status === 'playing';
  
  // Handle cell click
  const handleCellClick = (position) => {
    if (!isGameActive || !isPlayerTurn || game.board[position] !== null) {
      return;
    }
    
    onMove(position);
  };
  
  // Check if a cell is part of the winning line
  const isWinningCell = (position) => {
    return game.winningLine && game.winningLine.includes(position);
  };
  
  return (
    <BoardContainer>
      <BoardGrid>
        {game.board.map((cell, index) => (
          <Cell 
            key={index}
            onClick={() => handleCellClick(index)}
            disabled={!isGameActive || !isPlayerTurn || cell !== null}
            isWinning={isWinningCell(index)}
          >
            {cell && <Symbol symbol={cell}>{cell}</Symbol>}
          </Cell>
        ))}
      </BoardGrid>
    </BoardContainer>
  );
};

export default TicTacToeBoard;
