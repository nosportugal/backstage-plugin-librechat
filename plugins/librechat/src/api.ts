import {
  createApiRef,
  FetchApi,
  ConfigApi,
} from "@backstage/frontend-plugin-api";

/** A single chat message. */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * API for communicating with LibreChat through the backend proxy.
 *
 * @public
 */
export interface LibreChatApi {
  /**
   * Sends messages to LibreChat and yields streamed content chunks.
   *
   * @param messages - Conversation history
   * @param options - Optional override for apiKey (apiKey auth method only)
   * @returns An async generator yielding content strings as they arrive
   */
  sendMessage(
    messages: ChatMessage[],
    options?: {apiKey?: string},
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Checks that the given API key is valid by sending a short test message.
   *
   * @param apiKey - API key to validate
   * @returns The assistant's reply
   */
  checkApiKey(apiKey: string): Promise<string>;

  /**
   * In OIDC mode, checks that the caller's backend-held session works by
   * sending a short test message. Not available in apiKey mode.
   *
   * @returns The assistant's reply
   */
  checkConnection(): Promise<string>;
}

/**
 * API reference for the LibreChat API.
 *
 * @public
 */
export const libreChatApiRef = createApiRef<LibreChatApi>({
  id: "plugin.librechat.api",
});

/**
 * Extracts a human-readable message from a Backstage backend error body.
 * Backstage errors use {error: {name, message}, ...}; the plugin's own
 * router uses {error: "..."} or {error: "...", details: "..."}.
 */
function extractErrorMessage(errorBody: unknown, status: number): string {
  if (typeof errorBody !== "object" || errorBody === null) {
    return `Backend returned ${status}`;
  }
  const body = errorBody as {
    error?: unknown;
    details?: unknown;
  };
  if (typeof body.error === "string") {
    return body.error;
  }
  if (
    typeof body.error === "object" &&
    body.error !== null &&
    typeof (body.error as {message?: unknown}).message === "string"
  ) {
    return (body.error as {message: string}).message;
  }
  if (typeof body.details === "string") {
    return body.details;
  }
  return `Backend returned ${status}`;
}

/**
 * Error thrown when the backend reports a missing or invalid OIDC session
 * (`not_connected` / `token_invalid`). The chat UI catches this to show a
 * reconnect prompt instead of a generic failure.
 *
 * @public
 */
export class LibreChatAuthError extends Error {
  readonly code: "not_connected" | "token_invalid";

  constructor(code: "not_connected" | "token_invalid", message: string) {
    super(message);
    this.name = "LibreChatAuthError";
    this.code = code;
  }
}

function extractError(errorBody: unknown, status: number): Error {
  const body = (typeof errorBody === "object" && errorBody !== null
    ? errorBody
    : {}) as {error?: unknown; details?: unknown};
  if (body.error === "not_connected" || body.error === "token_invalid") {
    return new LibreChatAuthError(
      body.error,
      typeof body.details === "string"
        ? body.details
        : "Your LibreChat session has expired. Sign in again from Settings.",
    );
  }
  return new Error(extractErrorMessage(errorBody, status));
}

/**
 * Default implementation of the LibreChat API.
 * Calls the backend proxy and parses the SSE stream.
 *
 * @internal
 */
export class DefaultLibreChatApi implements LibreChatApi {
  private readonly fetchApi: FetchApi;
  private readonly configApi: ConfigApi;

  constructor(options: {fetchApi: FetchApi; configApi: ConfigApi}) {
    this.fetchApi = options.fetchApi;
    this.configApi = options.configApi;
  }

  private get backendBaseUrl(): string {
    return this.configApi.getString("backend.baseUrl").replace(/\/+$/, "");
  }

  async checkApiKey(apiKey: string): Promise<string> {
    const response = await this.fetchApi.fetch(
      `${this.backendBaseUrl}/api/librechat/check`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? {"x-librechat-api-key": apiKey} : {}),
        },
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw extractError(data, response.status);
    }

    const data = (await response.json()) as {ok: boolean; reply: string};
    return data.reply;
  }

  async checkConnection(): Promise<string> {
    const response = await this.fetchApi.fetch(
      `${this.backendBaseUrl}/api/librechat/check`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw extractError(data, response.status);
    }

    const data = (await response.json()) as {ok: boolean; reply: string};
    return data.reply;
  }

  async *sendMessage(
    messages: ChatMessage[],
    options?: {apiKey?: string},
  ): AsyncGenerator<string, void, unknown> {
    const response = await this.fetchApi.fetch(
      `${this.backendBaseUrl}/api/librechat/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options?.apiKey ? {"x-librechat-api-key": options.apiKey} : {}),
        },
        body: JSON.stringify({messages}),
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw extractError(errorBody, response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response stream available");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === "data: [DONE]") {
            return;
          }

          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (typeof content === "string" && content.length > 0) {
                yield content;
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
