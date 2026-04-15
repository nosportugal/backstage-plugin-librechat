import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { libreChatApiRef } from '../api/LibreChatApi';
import type { AgentConfig, AgentInfo } from '@internal/plugin-librechat-common';

export function useAdminConfig() {
  const api = useApi(libreChatApiRef);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.getConfig(), api.listAgents()])
      .then(([cfg, agentList]) => {
        if (!cancelled) {
          setConfig(cfg);
          setAgents(agentList);
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
  }, [api]);

  const updateConfig = useCallback(
    async (updates: Partial<AgentConfig>) => {
      setIsSaving(true);
      setError(null);
      try {
        const updated = await api.updateConfig(updates);
        setConfig(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSaving(false);
      }
    },
    [api],
  );

  return { config, agents, isLoading, isSaving, error, updateConfig };
}
