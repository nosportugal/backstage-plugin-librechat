import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatBubble } from './ChatBubble';

// Mock dependencies
jest.mock('@backstage/core-plugin-api', () => ({
  useApi: jest.fn().mockReturnValue({
    getConfig: jest.fn().mockResolvedValue({
      enabled: true,
      bubblePosition: 'bottom-right',
      allowedGroups: [],
    }),
  }),
}));

jest.mock('../../hooks/useConversation', () => ({
  useConversation: jest.fn().mockReturnValue({
    conversations: [],
    activeConversation: null,
    createConversation: jest.fn(),
    deleteConversation: jest.fn(),
    setActiveConversation: jest.fn(),
    isLoading: false,
  }),
}));

describe('ChatBubble', () => {
  it('should render the chat bubble FAB button', () => {
    render(<ChatBubble />);
    const button = screen.getByRole('button', { name: /open chat/i });
    expect(button).toBeInTheDocument();
  });

  it('should toggle chat window on click', () => {
    render(<ChatBubble />);
    const button = screen.getByRole('button', { name: /open chat/i });

    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should position the bubble based on props', () => {
    const { container } = render(<ChatBubble position="bottom-left" />);
    const bubble = container.firstChild as HTMLElement;
    expect(bubble).toHaveStyle({ left: '24px' });
  });
});
