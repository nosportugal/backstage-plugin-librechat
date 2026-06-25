import {useState, useEffect, useCallback} from "react";
import {useApi, storageApiRef} from "@backstage/frontend-plugin-api";

const STORAGE_BUCKET = "librechat-settings";
const API_KEY_KEY = "apiKey";
const CHAT_SIZE_KEY = "chatSize";

/** Available chat window sizes a user can choose from. */
export type ChatSize = "small" | "medium" | "large";

/** Pixel dimensions for each selectable chat window size. */
export const CHAT_SIZE_DIMENSIONS: Record<
  ChatSize,
  {width: number; height: number}
> = {
  small: {width: 340, height: 480},
  medium: {width: 400, height: 560},
  large: {width: 460, height: 680},
};

const DEFAULT_CHAT_SIZE: ChatSize = "medium";

function normalizeChatSize(value: string): ChatSize {
  return value === "small" || value === "medium" || value === "large"
    ? value
    : DEFAULT_CHAT_SIZE;
}

export interface LibreChatSettings {
  apiKey: string;
  chatSize: ChatSize;
}

export function useLibreChatSettings() {
  const storageApi = useApi(storageApiRef);
  const bucket = storageApi.forBucket(STORAGE_BUCKET);

  const [settings, setSettings] = useState<LibreChatSettings>({
    apiKey: "",
    chatSize: DEFAULT_CHAT_SIZE,
  });

  const safeGet = useCallback(
    (key: string): string => {
      try {
        return bucket.snapshot<string>(key).value ?? "";
      } catch {
        return "";
      }
    },
    [bucket],
  );

  // Load settings on mount
  useEffect(() => {
    setSettings({
      apiKey: safeGet(API_KEY_KEY),
      chatSize: normalizeChatSize(safeGet(CHAT_SIZE_KEY)),
    });

    // Subscribe to changes
    const apiKeySub = bucket.observe$<string>(API_KEY_KEY).subscribe((next) => {
      setSettings((prev) => ({...prev, apiKey: next.value ?? ""}));
    });
    const chatSizeSub = bucket
      .observe$<string>(CHAT_SIZE_KEY)
      .subscribe((next) => {
        setSettings((prev) => ({
          ...prev,
          chatSize: normalizeChatSize(next.value ?? ""),
        }));
      });

    return () => {
      apiKeySub.unsubscribe();
      chatSizeSub.unsubscribe();
    };
  }, [bucket, safeGet]);

  const saveSettings = useCallback(
    async (newSettings: LibreChatSettings) => {
      if (newSettings.apiKey) {
        await bucket.set(API_KEY_KEY, newSettings.apiKey);
      } else {
        await bucket.remove(API_KEY_KEY);
      }
      await bucket.set(CHAT_SIZE_KEY, newSettings.chatSize);
    },
    [bucket],
  );

  const clearSettings = useCallback(async () => {
    await bucket.remove(API_KEY_KEY);
  }, [bucket]);

  return {settings, saveSettings, clearSettings};
}
