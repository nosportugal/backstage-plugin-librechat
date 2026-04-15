import React from 'react';
import { Box, IconButton, Typography, Paper, Snackbar } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import AddIcon from '@material-ui/icons/Add';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatWindowProps {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  onNewConversation: () => Promise<void>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  open,
  onClose,
  conversationId,
  onNewConversation,
}) => {
  const { messages, streamingContent, isLoading, error, sendMessage, clearError } =
    useChat(conversationId);

  const handleSend = async (content: string) => {
    if (!conversationId) {
      await onNewConversation();
    }
    await sendMessage(content);
  };

  if (!open) return null;

  return (
    <Paper
      role="dialog"
      aria-label="Chat window"
      elevation={8}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 380,
        height: 520,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1}
        style={{ backgroundColor: '#1976d2', color: '#fff' }}
      >
        <Typography variant="subtitle1">Chat</Typography>
        <Box>
          <IconButton size="small" onClick={onNewConversation} aria-label="new conversation">
            <AddIcon style={{ color: '#fff' }} />
          </IconButton>
          <IconButton size="small" onClick={onClose} aria-label="close">
            <CloseIcon style={{ color: '#fff' }} />
          </IconButton>
        </Box>
      </Box>

      {/* Messages */}
      <MessageList messages={messages} streamingContent={streamingContent} isLoading={isLoading} />

      {/* Error */}
      {error && <Snackbar open autoHideDuration={5000} onClose={clearError} message={error} />}

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={isLoading || streamingContent !== null} />
    </Paper>
  );
};
