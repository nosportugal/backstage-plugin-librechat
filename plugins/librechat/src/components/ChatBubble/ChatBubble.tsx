import React, { useState, useCallback } from 'react';
import { Fab, Box } from '@material-ui/core';
import ChatIcon from '@material-ui/icons/Chat';
import { useConversation } from '../../hooks/useConversation';
import { ChatWindow } from './ChatWindow';
import type { BubblePosition } from '@internal/plugin-librechat-common';

interface ChatBubbleProps {
  position?: BubblePosition;
}

const positionStyles: Record<BubblePosition, React.CSSProperties> = {
  'bottom-right': { position: 'fixed', bottom: 24, right: 24, zIndex: 1300 },
  'bottom-left': { position: 'fixed', bottom: 24, left: 24, zIndex: 1300 },
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ position = 'bottom-right' }) => {
  const [open, setOpen] = useState(false);
  const { activeConversation, createConversation } = useConversation();

  const handleToggle = useCallback(async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !activeConversation) {
      await createConversation();
    }
  }, [open, activeConversation, createConversation]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleNewConversation = useCallback(async () => {
    await createConversation();
  }, [createConversation]);

  return (
    <Box style={positionStyles[position]}>
      {open && (
        <Box mb={2}>
          <ChatWindow
            open={open}
            onClose={handleClose}
            conversationId={activeConversation?.id ?? null}
            onNewConversation={handleNewConversation}
          />
        </Box>
      )}
      <Fab color="primary" onClick={handleToggle} aria-label={open ? 'close chat' : 'open chat'}>
        <ChatIcon />
      </Fab>
    </Box>
  );
};
