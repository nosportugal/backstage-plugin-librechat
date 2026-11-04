import {useState, useEffect, useCallback, useRef} from "react";
import {
  useApi,
  storageApiRef,
  identityApiRef,
} from "@backstage/frontend-plugin-api";
import type {ChatMessage} from "../api";

const STORAGE_BUCKET = "librechat-history";
const STORAGE_KEY = "conversations";
const NOTICE_KEY = "retention-notice-shown";
const MAX_CONVERSATIONS = 5;
const TITLE_MAX_LENGTH = 60;

export interface LibreChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

interface StoredHistory {
  userKey: string;
  conversations: LibreChatConversation[];
  activeConversationId: string | null;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function titleFromMessage(content: string): string {
  const title = content.replace(/\s+/g, " ").trim();
  return title.length > TITLE_MAX_LENGTH
    ? `${title.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : title || "New conversation";
}

function getUserKey(userEntityRef: string | undefined): string {
  return userEntityRef || "anonymous";
}

function parseHistory(value: string, userKey: string): StoredHistory {
  try {
    const parsed = JSON.parse(value) as Partial<StoredHistory>;
    if (
      parsed.userKey === userKey &&
      Array.isArray(parsed.conversations) &&
      (typeof parsed.activeConversationId === "string" ||
        parsed.activeConversationId === null)
    ) {
      return {
        userKey,
        conversations: parsed.conversations.filter(
          (conversation): conversation is LibreChatConversation =>
            Boolean(
              conversation &&
              typeof conversation.id === "string" &&
              typeof conversation.title === "string" &&
              Array.isArray(conversation.messages) &&
              typeof conversation.updatedAt === "number",
            ),
        ),
        activeConversationId: parsed.activeConversationId,
      };
    }
  } catch {
    // Ignore malformed or legacy local data.
  }

  return {userKey, conversations: [], activeConversationId: null};
}

export function useLibreChatHistory() {
  const storageApi = useApi(storageApiRef);
  const identityApi = useApi(identityApiRef);
  const bucket = storageApi.forBucket(STORAGE_BUCKET);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [conversations, setConversations] = useState<LibreChatConversation[]>(
    [],
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [retentionNoticeShown, setRetentionNoticeShown] = useState(false);
  // Mirrors the latest history so callbacks captured before an awaited
  // mutation (e.g. delete) never persist a stale conversation list.
  const historyRef = useRef<{
    conversations: LibreChatConversation[];
    activeConversationId: string | null;
  }>({conversations: [], activeConversationId: null});

  const applyHistory = useCallback(
    (
      nextConversations: LibreChatConversation[],
      nextActiveConversationId: string | null,
    ) => {
      historyRef.current = {
        conversations: nextConversations,
        activeConversationId: nextActiveConversationId,
      };
      setConversations(nextConversations);
      setActiveConversationId(nextActiveConversationId);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    identityApi
      .getBackstageIdentity()
      .then((identity) => {
        if (active) {
          setUserKey(getUserKey(identity?.userEntityRef));
        }
      })
      .catch(() => {
        if (active) {
          setUserKey("anonymous");
        }
      });
    return () => {
      active = false;
    };
  }, [identityApi]);

  useEffect(() => {
    if (!userKey) return undefined;

    let active = true;
    const load = async () => {
      try {
        const snapshot = bucket.snapshot<string>(STORAGE_KEY).value ?? "";
        const stored = parseHistory(snapshot, userKey);
        const notice = bucket.snapshot<boolean>(NOTICE_KEY).value ?? false;
        if (active) {
          applyHistory(stored.conversations, stored.activeConversationId);
          setRetentionNoticeShown(notice);
        }
      } catch {
        // Treat unavailable or malformed storage as empty local history.
      }
    };
    void load();

    const subscription = bucket
      .observe$<string>(STORAGE_KEY)
      .subscribe((next) => {
        if (active) {
          const stored = parseHistory(next.value ?? "", userKey);
          applyHistory(stored.conversations, stored.activeConversationId);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applyHistory, bucket, userKey]);

  const persist = useCallback(
    async (
      nextConversations: LibreChatConversation[],
      nextActiveConversationId: string | null,
    ) => {
      if (!userKey) return;
      try {
        await bucket.set(
          STORAGE_KEY,
          JSON.stringify({
            userKey,
            conversations: nextConversations,
            activeConversationId: nextActiveConversationId,
          } satisfies StoredHistory),
        );
      } catch {
        // Local history is best-effort; chat functionality must continue.
      }
    },
    [bucket, userKey],
  );

  const saveConversation = useCallback(
    async (messages: ChatMessage[], previousId: string | null) => {
      if (!userKey || messages.length === 0) return null;
      const firstUserMessage = messages.find(
        (message) => message.role === "user",
      );
      if (!firstUserMessage) return null;

      const current = historyRef.current;
      const id = previousId ?? createId();
      const existing = current.conversations.find(
        (conversation) => conversation.id === id,
      );
      const conversation: LibreChatConversation = {
        id,
        title: existing?.title ?? titleFromMessage(firstUserMessage.content),
        messages,
        updatedAt: Date.now(),
      };
      const next = [
        conversation,
        ...current.conversations.filter((item) => item.id !== id),
      ];
      const trimmed = next.slice(0, MAX_CONVERSATIONS);
      const evicted = next.length > MAX_CONVERSATIONS;
      applyHistory(trimmed, id);
      await persist(trimmed, id);
      return {id, evicted};
    },
    [applyHistory, persist, userKey],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const current = historyRef.current;
      const next = current.conversations.filter(
        (conversation) => conversation.id !== id,
      );
      const nextActive =
        current.activeConversationId === id
          ? null
          : current.activeConversationId;
      applyHistory(next, nextActive);
      await persist(next, nextActive);
    },
    [applyHistory, persist],
  );

  const clearAll = useCallback(async () => {
    applyHistory([], null);
    if (userKey) {
      try {
        await bucket.remove(STORAGE_KEY);
      } catch {
        // Ignore unavailable local storage.
      }
    }
  }, [applyHistory, bucket, userKey]);

  const markRetentionNoticeShown = useCallback(async () => {
    setRetentionNoticeShown(true);
    try {
      await bucket.set(NOTICE_KEY, true);
    } catch {
      // Ignore unavailable local storage.
    }
  }, [bucket]);

  const startNewConversation = useCallback(async () => {
    const current = historyRef.current;
    applyHistory(current.conversations, null);
    await persist(current.conversations, null);
  }, [applyHistory, persist]);

  const selectConversation = useCallback(
    async (id: string) => {
      const current = historyRef.current;
      const selected = current.conversations.find(
        (conversation) => conversation.id === id,
      );
      if (!selected) return;
      const next = [
        {...selected, updatedAt: Date.now()},
        ...current.conversations.filter((conversation) => conversation.id !== id),
      ];
      applyHistory(next, id);
      await persist(next, id);
    },
    [applyHistory, persist],
  );

  return {
    conversations,
    activeConversationId,
    retentionNoticeShown,
    saveConversation,
    deleteConversation,
    clearAll,
    markRetentionNoticeShown,
    startNewConversation,
    selectConversation,
  };
}
