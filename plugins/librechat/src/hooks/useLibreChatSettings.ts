import {useState, useEffect, useCallback} from "react";
import {useApi, storageApiRef} from "@backstage/frontend-plugin-api";

const STORAGE_BUCKET = "librechat-settings";
const API_KEY_KEY = "apiKey";
const AGENT_ID_KEY = "agentId";
const AGENT_NAME_KEY = "agentName";

export interface LibreChatSettings {
  apiKey: string;
  agentId: string;
  agentName: string;
}

export function useLibreChatSettings() {
  const storageApi = useApi(storageApiRef);
  const bucket = storageApi.forBucket(STORAGE_BUCKET);

  const [settings, setSettings] = useState<LibreChatSettings>({
    apiKey: "",
    agentId: "",
    agentName: "",
  });

  const safeGet = (key: string): string => {
    try {
      return bucket.snapshot<string>(key).value ?? "";
    } catch {
      return "";
    }
  };

  // Load settings on mount
  useEffect(() => {
    setSettings({
      apiKey: safeGet(API_KEY_KEY),
      agentId: safeGet(AGENT_ID_KEY),
      agentName: safeGet(AGENT_NAME_KEY),
    });

    // Subscribe to changes
    const sub1 = bucket.observe$<string>(API_KEY_KEY).subscribe((next) => {
      setSettings((prev) => ({...prev, apiKey: next.value ?? ""}));
    });
    const sub2 = bucket.observe$<string>(AGENT_ID_KEY).subscribe((next) => {
      setSettings((prev) => ({...prev, agentId: next.value ?? ""}));
    });
    const sub3 = bucket.observe$<string>(AGENT_NAME_KEY).subscribe((next) => {
      setSettings((prev) => ({...prev, agentName: next.value ?? ""}));
    });

    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
      sub3.unsubscribe();
    };
  }, [bucket]);

  const saveSettings = useCallback(
    async (newSettings: LibreChatSettings) => {
      await bucket.set(API_KEY_KEY, newSettings.apiKey || undefined);
      await bucket.set(AGENT_ID_KEY, newSettings.agentId || undefined);
      await bucket.set(AGENT_NAME_KEY, newSettings.agentName || undefined);
    },
    [bucket],
  );

  const clearSettings = useCallback(async () => {
    await bucket.remove(API_KEY_KEY);
    await bucket.remove(AGENT_ID_KEY);
    await bucket.remove(AGENT_NAME_KEY);
  }, [bucket]);

  return {settings, saveSettings, clearSettings};
}
