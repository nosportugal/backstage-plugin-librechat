import React, { useState, useCallback } from 'react';
import { TextField, IconButton, Box } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled,
  placeholder = 'Type a message...',
}) => {
  const [value, setValue] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) {
      onSend(trimmed);
      setValue('');
    }
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <Box display="flex" alignItems="center" p={1} style={{ borderTop: '1px solid #e0e0e0' }}>
      <TextField
        fullWidth
        size="small"
        variant="outlined"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        inputProps={{ 'aria-label': 'message input' }}
      />
      <IconButton
        color="primary"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="send"
        size="small"
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
};
