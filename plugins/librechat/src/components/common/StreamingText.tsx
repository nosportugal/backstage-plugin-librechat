import React from 'react';
import { Box, Typography } from '@material-ui/core';

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
}

export const StreamingText: React.FC<StreamingTextProps> = ({ content, isStreaming = false }) => {
  return (
    <Box data-testid="streaming-text" display="inline">
      <Typography variant="body2" component="span">
        {content}
      </Typography>
      {isStreaming && (
        <Box
          data-streaming="true"
          component="span"
          display="inline-block"
          width={8}
          height={16}
          ml={0.5}
          style={{
            backgroundColor: '#666',
            animation: 'blink 1s step-end infinite',
            verticalAlign: 'text-bottom',
          }}
        />
      )}
    </Box>
  );
};
