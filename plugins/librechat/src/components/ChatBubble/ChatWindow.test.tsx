import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWindow } from './ChatWindow';

jest.mock('../../hooks/useChat', () => ({
  useChat: jest.fn().mockReturnValue({
    messages: [],
    streamingContent: null,
    isLoading: false,
    sendMessage: jest.fn(),
    error: null,
    clearError: jest.fn(),
  }),
}));

describe('ChatWindow', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    conversationId: 'conv-1',
    onNewConversation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open is true', () => {
    render(<ChatWindow {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<ChatWindow {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<ChatWindow {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should contain MessageList and MessageInput components', () => {
    render(<ChatWindow {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display error message when error exists', () => {
    const useChat = require('../../hooks/useChat').useChat;
    useChat.mockReturnValue({
      messages: [],
      streamingContent: null,
      isLoading: false,
      sendMessage: jest.fn(),
      error: 'Connection failed',
      clearError: jest.fn(),
    });

    render(<ChatWindow {...defaultProps} />);
    expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
  });
});
