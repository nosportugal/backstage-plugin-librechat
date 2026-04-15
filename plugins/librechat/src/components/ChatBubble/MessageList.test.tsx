import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageList } from './MessageList';
import type { Message } from '@internal/plugin-librechat-common';

describe('MessageList', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Hello, how are you?',
      status: 'delivered',
      createdAt: '2026-04-15T10:00:00Z',
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'I am doing well, thank you!',
      status: 'delivered',
      createdAt: '2026-04-15T10:00:05Z',
    },
  ];

  it('should render all messages', () => {
    render(<MessageList messages={mockMessages} streamingContent={null} isLoading={false} />);

    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument();
  });

  it('should show loading indicator when isLoading is true', () => {
    render(<MessageList messages={[]} streamingContent={null} isLoading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display streaming content for in-progress response', () => {
    render(
      <MessageList
        messages={mockMessages}
        streamingContent="I am currently thinking..."
        isLoading={false}
      />,
    );

    expect(screen.getByText('I am currently thinking...')).toBeInTheDocument();
  });

  it('should render empty state when no messages', () => {
    render(<MessageList messages={[]} streamingContent={null} isLoading={false} />);

    expect(screen.getByText(/start a conversation/i) || screen.queryByRole('list')).toBeTruthy();
  });

  it('should differentiate user and assistant messages visually', () => {
    const { container } = render(
      <MessageList messages={mockMessages} streamingContent={null} isLoading={false} />,
    );

    const messageElements = container.querySelectorAll('[data-role]');
    expect(messageElements.length).toBeGreaterThanOrEqual(2);
  });
});
