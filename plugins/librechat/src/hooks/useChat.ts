import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { libreChatApiRef } from '../api/LibreChatApi';
import type { Message } from '@internal/plugin-librechat-common';

export function useChat(conversationId: string | null) {
  const api = useApi(libreChatApiRef);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!conversationId);
  const [error, setError] = useState<string | null>(null);
  const cancelStream = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    api
      .listMessages(conversationId)
      .then(result => {
        if (!cancelled) {
          setMessages(result.items);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;

      setError(null);

      // Show user message optimistically
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        role: 'user',
        content,
        status: 'delivered',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimisticMessage]);

      try {
        const result = await api.sendMessage(conversationId, content);

        // Replace optimistic message with the real one
        setMessages(prev =>
          prev.map(m => (m.id === optimisticMessage.id ? result.userMessage : m)),
        );

        // Start streaming
        setStreamingContent('');
        let accumulated = '';

        cancelStream.current = api.streamResponse(result.streamUrl, {
          onToken: (token: string) => {
            accumulated += token;
            setStreamingContent(accumulated);
          },
          onDone: () => {
            setStreamingContent(null);
            // Reload messages to get the final saved assistant message
            api.listMessages(conversationId).then(r => setMessages(r.items));
          },
          onError: err => {
            setStreamingContent(null);
            setError(err.message);
            // Still reload messages in case some were saved
            api.listMessages(conversationId).then(r => setMessages(r.items));
          },
        });
      } catch (err) {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [api, conversationId],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    return () => {
      cancelStream.current?.();
    };
  }, []);

  return { messages, streamingContent, isLoading, error, sendMessage, clearError };
}
