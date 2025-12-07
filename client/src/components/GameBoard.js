import React from 'react';
import styled from 'styled-components';

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 10px;
  width: 300px;
  height: 300px;
  margin: 0 auto;
`;

const Cell = styled.div`
  background-color: var(--light-gray);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.disabled ? 'var(--light-gray)' : '#e2e6ea'};
  }
  
  &.x {
    color: #ff6b6b;
  }
  
  &.o {
    color: #4dabf7;
  }
  
  &.winning {
    background-color: #d4edda;
    animation: pulse 1s infinite;
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
`;

function GameBoard({ board, winningLine, onCellClick, disabled }) {
  const renderCell = (index) => {
    const value = board[index];
    const isWinningCell = winningLine && winningLine.includes(index);
    
    return (
      <Cell 
        key={index}
        className={`${value ? value.toLowerCase() : ''} ${isWinningCell ? 'winning' : ''}`}
        onClick={() => !disabled && !value && onCellClick(index)}
        disabled={disabled || value !== null}
      >
        {value}
      </Cell>
    );
  };
  
  return (
    <Board>
      {Array(9).fill(null).map((_, index) => renderCell(index))}
    </Board>
  );
}

export default GameBoard;
