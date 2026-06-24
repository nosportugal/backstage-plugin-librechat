import {useState, useEffect, useCallback} from "react";
import {useApi, storageApiRef} from "@backstage/frontend-plugin-api";

const STORAGE_BUCKET = "librechat-settings";
const API_KEY_KEY = "apiKey";

export interface LibreChatSettings {
  apiKey: string;
}

export function useLibreChatSettings() {
  const storageApi = useApi(storageApiRef);
  const bucket = storageApi.forBucket(STORAGE_BUCKET);

  const [settings, setSettings] = useState<LibreChatSettings>({
    apiKey: "",
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
    });

    // Subscribe to changes
    const sub = bucket.observe$<string>(API_KEY_KEY).subscribe((next) => {
      setSettings((prev) => ({...prev, apiKey: next.value ?? ""}));
    });

    return () => {
      sub.unsubscribe();
    };
  }, [bucket]);

  const saveSettings = useCallback(
    async (newSettings: LibreChatSettings) => {
      if (newSettings.apiKey) {
        await bucket.set(API_KEY_KEY, newSettings.apiKey);
      } else {
        await bucket.remove(API_KEY_KEY);
      }
    },
    [bucket],
  );

  const clearSettings = useCallback(async () => {
    await bucket.remove(API_KEY_KEY);
  }, [bucket]);

  return {settings, saveSettings, clearSettings};
}
