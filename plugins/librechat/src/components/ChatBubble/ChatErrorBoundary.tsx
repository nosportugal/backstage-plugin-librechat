import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@material-ui/core';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ChatErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ChatBubble error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box p={2} textAlign="center">
          <Typography variant="body2" color="error" gutterBottom>
            Something went wrong with the chat widget.
          </Typography>
          <Button size="small" variant="outlined" onClick={this.handleReset}>
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
