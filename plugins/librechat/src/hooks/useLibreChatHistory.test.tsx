import {act} from "react";
import {ApiProvider} from "@backstage/core-app-api";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import {createRoot, Root} from "react-dom/client";
import {
  identityApiRef,
  storageApiRef,
} from "@backstage/frontend-plugin-api";
import {useLibreChatHistory} from "./useLibreChatHistory";

const store = new Map<string, unknown>();
const bucket = {
  snapshot: (key: string) => ({key, value: store.get(key)}),
  observe$: () => ({subscribe: () => ({unsubscribe: () => {}})}),
  set: async (key: string, value: unknown) => {
    store.set(key, value);
  },
  remove: async (key: string) => {
    store.delete(key);
  },
};
const storageApi = {forBucket: () => bucket};
const identityApi = {
  getBackstageIdentity: async () => ({userEntityRef: "user:default/test"}),
};

const apis = {
  get: (ref: {id: string}) => {
    if (ref.id === storageApiRef.id) return storageApi;
    if (ref.id === identityApiRef.id) return identityApi;
    return undefined;
  },
};

type History = ReturnType<typeof useLibreChatHistory>;

function storedConversationIds(): string[] {
  const raw = store.get("conversations");
  if (typeof raw !== "string") return [];
  return JSON.parse(raw).conversations.map((c: {id: string}) => c.id);
}

describe("useLibreChatHistory", () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: History;

  function Probe() {
    latest = useLibreChatHistory();
    return null;
  }

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(async () => {
    store.clear();
    container = document.createElement("div");
    root = createRoot(container);
    await act(async () => {
      root.render(
        <ApiProvider apis={apis as any}>
          <Probe />
        </ApiProvider>,
      );
    });
    const messages = [
      {role: "user" as const, content: "hello"},
      {role: "assistant" as const, content: "hi"},
    ];
    await act(async () => {
      await latest.saveConversation(messages, "a");
    });
    await act(async () => {
      await latest.saveConversation(messages, "b");
    });
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("does not restore history when a new conversation starts after clearAll", async () => {
    const staleStart = latest.startNewConversation;
    await act(async () => {
      await latest.clearAll();
      await staleStart();
    });

    expect(storedConversationIds()).toEqual([]);
    expect(latest.conversations).toEqual([]);
  });

  it("does not restore a deleted conversation when a new conversation starts", async () => {
    const staleStart = latest.startNewConversation;
    await act(async () => {
      await latest.deleteConversation("b");
      await staleStart();
    });

    expect(storedConversationIds()).toEqual(["a"]);
    expect(latest.conversations.map((c) => c.id)).toEqual(["a"]);
    expect(latest.activeConversationId).toBeNull();
  });
});
