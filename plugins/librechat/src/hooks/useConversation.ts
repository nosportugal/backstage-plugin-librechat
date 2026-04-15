import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { libreChatApiRef } from '../api/LibreChatApi';
import type { Conversation } from '@internal/plugin-librechat-common';

export function useConversation() {
  const api = useApi(libreChatApiRef);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .listConversations()
      .then(result => {
        if (!cancelled) {
          setConversations(result.items);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api]);

  const createConversation = useCallback(
    async (title?: string) => {
      const conv = await api.createConversation(title);
      setConversations(prev => [conv, ...prev]);
      setActiveConversation(conv);
      return conv;
    },
    [api],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await api.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation?.id === id) {
        setActiveConversation(null);
      }
    },
    [api, activeConversation],
  );

  const setActive = useCallback(
    (id: string) => {
      const conv = conversations.find(c => c.id === id) ?? null;
      setActiveConversation(conv);
    },
    [conversations],
  );

  return {
    conversations,
    activeConversation,
    isLoading,
    createConversation,
    deleteConversation,
    setActiveConversation: setActive,
  };
}
