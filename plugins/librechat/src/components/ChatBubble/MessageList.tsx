import React, { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, makeStyles } from '@material-ui/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@internal/plugin-librechat-common';

const useStyles = makeStyles(() => ({
  markdown: {
    '& p': { margin: '0.25em 0' },
    '& p:first-child': { marginTop: 0 },
    '& p:last-child': { marginBottom: 0 },
    '& pre': {
      backgroundColor: 'rgba(0,0,0,0.06)',
      borderRadius: 4,
      padding: '8px 12px',
      overflowX: 'auto',
      fontSize: '0.85em',
    },
    '& code': {
      backgroundColor: 'rgba(0,0,0,0.06)',
      borderRadius: 3,
      padding: '1px 4px',
      fontSize: '0.9em',
    },
    '& pre code': {
      backgroundColor: 'transparent',
      padding: 0,
    },
    '& ul, & ol': { margin: '0.25em 0', paddingLeft: '1.5em' },
    '& table': { borderCollapse: 'collapse', width: '100%' },
    '& th, & td': {
      border: '1px solid rgba(0,0,0,0.2)',
      padding: '4px 8px',
      fontSize: '0.85em',
    },
    '& blockquote': {
      borderLeft: '3px solid rgba(0,0,0,0.2)',
      margin: '0.25em 0',
      paddingLeft: 8,
      color: 'rgba(0,0,0,0.6)',
    },
    '& a': { color: '#1976d2' },
  },
  markdownUser: {
    '& pre': { backgroundColor: 'rgba(255,255,255,0.15)' },
    '& code': { backgroundColor: 'rgba(255,255,255,0.15)' },
    '& th, & td': { borderColor: 'rgba(255,255,255,0.3)' },
    '& blockquote': { borderLeftColor: 'rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.8)' },
    '& a': { color: '#90caf9' },
  },
}));

interface MessageListProps {
  messages: Message[];
  streamingContent: string | null;
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingContent,
  isLoading,
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const classes = useStyles();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" flex={1} p={2}>
        <CircularProgress role="progressbar" />
      </Box>
    );
  }

  if (messages.length === 0 && !streamingContent) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" flex={1} p={2}>
        <Typography variant="body2" color="textSecondary">
          Start a conversation by typing a message below
        </Typography>
      </Box>
    );
  }

  return (
    <Box flex={1} overflow="auto" p={1} role="list">
      {messages.map(message => (
        <Box
          key={message.id}
          data-role={message.role}
          display="flex"
          justifyContent={message.role === 'user' ? 'flex-end' : 'flex-start'}
          mb={1}
        >
          <Box
            px={2}
            py={1}
            borderRadius={12}
            maxWidth="80%"
            style={{
              backgroundColor: message.role === 'user' ? '#1976d2' : '#f5f5f5',
              color: message.role === 'user' ? '#fff' : '#000',
            }}
          >
            <Typography
              variant="body2"
              component="div"
              className={`${classes.markdown} ${message.role === 'user' ? classes.markdownUser : ''}`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </Typography>
          </Box>
        </Box>
      ))}
      {streamingContent !== null && (
        <Box data-role="assistant" display="flex" justifyContent="flex-start" mb={1}>
          <Box
            px={2}
            py={1}
            borderRadius={12}
            maxWidth="80%"
            style={{ backgroundColor: '#f5f5f5' }}
          >
            <Typography variant="body2" component="div" className={classes.markdown}>
              {streamingContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamingContent}
                </ReactMarkdown>
              ) : (
                '...'
              )}
            </Typography>
          </Box>
        </Box>
      )}
      <div ref={endRef} />
    </Box>
  );
};
