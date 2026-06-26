import {useState, useEffect, useCallback} from "react";
import {useApi, storageApiRef} from "@backstage/frontend-plugin-api";

const STORAGE_BUCKET = "librechat-settings";
const API_KEY_KEY = "apiKey";
const CHAT_SIZE_KEY = "chatSize";
const BUBBLE_POSITION_KEY = "bubblePosition";
const ENABLED_KEY = "enabled";

/** Available chat window sizes a user can choose from. */
export type ChatSize = "small" | "medium" | "large";

/** Persisted on-screen position of the chat bubble (top-left of the FAB). */
export type BubblePosition = {x: number; y: number} | null;

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

function normalizeBubblePosition(value: string): BubblePosition {
  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      typeof parsed.x === "number" &&
      typeof parsed.y === "number"
    ) {
      return {x: parsed.x, y: parsed.y};
    }
  } catch {
    // ignore malformed values
  }
  return null;
}

export interface LibreChatSettings {
  apiKey: string;
  chatSize: ChatSize;
  bubblePosition: BubblePosition;
  /** Per-user toggle controlling whether the chat bubble is shown. */
  enabled: boolean;
}

export function useLibreChatSettings() {
  const storageApi = useApi(storageApiRef);
  const bucket = storageApi.forBucket(STORAGE_BUCKET);

  const [settings, setSettings] = useState<LibreChatSettings>({
    apiKey: "",
    chatSize: DEFAULT_CHAT_SIZE,
    bubblePosition: null,
    enabled: true,
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

  // The enabled flag defaults to true so the bubble is opt-out, not opt-in.
  const safeGetEnabled = useCallback((): boolean => {
    try {
      return bucket.snapshot<boolean>(ENABLED_KEY).value ?? true;
    } catch {
      return true;
    }
  }, [bucket]);

  // Load settings on mount
  useEffect(() => {
    setSettings({
      apiKey: safeGet(API_KEY_KEY),
      chatSize: normalizeChatSize(safeGet(CHAT_SIZE_KEY)),
      bubblePosition: normalizeBubblePosition(safeGet(BUBBLE_POSITION_KEY)),
      enabled: safeGetEnabled(),
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
    const bubblePositionSub = bucket
      .observe$<string>(BUBBLE_POSITION_KEY)
      .subscribe((next) => {
        setSettings((prev) => ({
          ...prev,
          bubblePosition: normalizeBubblePosition(next.value ?? ""),
        }));
      });
    const enabledSub = bucket
      .observe$<boolean>(ENABLED_KEY)
      .subscribe((next) => {
        setSettings((prev) => ({
          ...prev,
          enabled: next.value ?? true,
        }));
      });

    return () => {
      apiKeySub.unsubscribe();
      chatSizeSub.unsubscribe();
      bubblePositionSub.unsubscribe();
      enabledSub.unsubscribe();
    };
  }, [bucket, safeGet, safeGetEnabled]);

  const saveSettings = useCallback(
    async (newSettings: Pick<LibreChatSettings, "apiKey" | "chatSize">) => {
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

  const saveBubblePosition = useCallback(
    async (position: BubblePosition) => {
      if (position) {
        await bucket.set(BUBBLE_POSITION_KEY, JSON.stringify(position));
      } else {
        await bucket.remove(BUBBLE_POSITION_KEY);
      }
    },
    [bucket],
  );

  const saveEnabled = useCallback(
    async (enabled: boolean) => {
      await bucket.set(ENABLED_KEY, enabled);
    },
    [bucket],
  );

  return {
    settings,
    saveSettings,
    clearSettings,
    saveBubblePosition,
    saveEnabled,
  };
}
