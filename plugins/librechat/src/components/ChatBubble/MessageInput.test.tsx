import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  const mockOnSend = jest.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
  });

  it('should render text input and send button', () => {
    render(<MessageInput onSend={mockOnSend} disabled={false} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should disable send button when input is empty', () => {
    render(<MessageInput onSend={mockOnSend} disabled={false} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('should call onSend when send button is clicked', async () => {
    render(<MessageInput onSend={mockOnSend} disabled={false} />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    expect(mockOnSend).toHaveBeenCalledWith('Hello');
  });

  it('should call onSend on Enter key press', async () => {
    render(<MessageInput onSend={mockOnSend} disabled={false} />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello{enter}');

    expect(mockOnSend).toHaveBeenCalledWith('Hello');
  });

  it('should clear input after sending', async () => {
    render(<MessageInput onSend={mockOnSend} disabled={false} />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello{enter}');

    expect(input).toHaveValue('');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<MessageInput onSend={mockOnSend} disabled={true} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should show custom placeholder', () => {
    render(<MessageInput onSend={mockOnSend} disabled={false} placeholder="Ask me anything..." />);

    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
  });
});
