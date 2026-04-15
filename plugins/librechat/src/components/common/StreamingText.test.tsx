import React from 'react';
import { render, screen } from '@testing-library/react';
import { StreamingText } from './StreamingText';

describe('StreamingText', () => {
  it('should render accumulated text', () => {
    render(<StreamingText content="Hello, how can I" />);

    expect(screen.getByText('Hello, how can I')).toBeInTheDocument();
  });

  it('should show cursor indicator when streaming', () => {
    const { container } = render(<StreamingText content="Hello" isStreaming />);

    expect(container.querySelector('[data-streaming="true"]')).toBeInTheDocument();
  });

  it('should not show cursor when not streaming', () => {
    const { container } = render(<StreamingText content="Hello" isStreaming={false} />);

    expect(container.querySelector('[data-streaming="true"]')).not.toBeInTheDocument();
  });

  it('should render empty content gracefully', () => {
    render(<StreamingText content="" isStreaming />);

    expect(screen.getByTestId('streaming-text')).toBeInTheDocument();
  });
});
