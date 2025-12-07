import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ChatHeader = styled.div`
  padding: 10px 15px;
  background-color: var(--light-gray);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  font-weight: bold;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const MessageBubble = styled.div`
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 18px;
  margin-bottom: 10px;
  word-break: break-word;
  
  &.sent {
    align-self: flex-end;
    background-color: var(--primary-color);
    color: white;
  }
  
  &.received {
    align-self: flex-start;
    background-color: var(--light-gray);
  }
`;

const MessageInfo = styled.div`
  font-size: 0.75rem;
  margin-bottom: 4px;
  
  &.sent {
    text-align: right;
    color: #e7f5ff;
  }
  
  &.received {
    color: #6c757d;
  }
`;

const ChatInputContainer = styled.form`
  display: flex;
  padding: 10px;
  border-top: 1px solid var(--border-color);
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin-right: 10px;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const SendButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 15px;
  cursor: pointer;
  
  &:hover {
    background-color: var(--primary-dark);
  }
  
  &:disabled {
    background-color: var(--light-gray);
    cursor: not-allowed;
  }
`;

function ChatBox({ messages, onSendMessage, currentUserId }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <ChatContainer>
      <ChatHeader>Game Chat</ChatHeader>
      
      <MessagesContainer>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6c757d', marginTop: '20px' }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isSent = msg.userId === currentUserId;
            
            return (
              <MessageBubble key={msg.id} className={isSent ? 'sent' : 'received'}>
                <MessageInfo className={isSent ? 'sent' : 'received'}>
                  {!isSent && `${msg.username} • `}
                  {formatTime(msg.timestamp)}
                </MessageInfo>
                {msg.message}
              </MessageBubble>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      <ChatInputContainer onSubmit={handleSubmit}>
        <ChatInput
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <SendButton type="submit" disabled={!message.trim()}>
          Send
        </SendButton>
      </ChatInputContainer>
    </ChatContainer>
  );
}

export default ChatBox;
