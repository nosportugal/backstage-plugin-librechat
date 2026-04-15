import { createApiRef, FetchApi, ConfigApi } from '@backstage/frontend-plugin-api';

/** A single chat message. */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** An available LibreChat agent (model). */
export interface Agent {
  id: string;
  name: string;
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
   * @param options - Optional overrides for agentId / apiKey
   * @returns An async generator yielding content strings as they arrive
   */
  sendMessage(
    messages: ChatMessage[],
    options?: { agentId?: string; apiKey?: string },
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Lists available agents using the provided API key.
   *
   * @param apiKey - API key to authenticate with
   * @returns Array of available agents
   */
  listAgents(apiKey: string): Promise<Agent[]>;
}

/**
 * API reference for the LibreChat API.
 *
 * @public
 */
export const libreChatApiRef = createApiRef<LibreChatApi>({
  id: 'plugin.librechat.api',
});

/**
 * Default implementation of the LibreChat API.
 * Calls the backend proxy and parses the SSE stream.
 *
 * @internal
 */
export class DefaultLibreChatApi implements LibreChatApi {
  private readonly fetchApi: FetchApi;
  private readonly configApi: ConfigApi;

  constructor(options: { fetchApi: FetchApi; configApi: ConfigApi }) {
    this.fetchApi = options.fetchApi;
    this.configApi = options.configApi;
  }

  async listAgents(apiKey: string): Promise<Agent[]> {
    const baseUrl = this.configApi.getString('librechat.baseUrl').replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/api/agents/v1/models`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API key');
      }
      throw new Error(`LibreChat returned ${response.status}`);
    }

    const data = await response.json();
    // LibreChat returns OpenAI-compatible models list: { data: [{ id, name?, ... }] }
    const models = (data as { data?: Array<{ id: string; name?: string }> }).data ?? [];
    return models.map(m => ({ id: m.id, name: m.name ?? m.id }));
  }

  async *sendMessage(
    messages: ChatMessage[],
    options?: { agentId?: string; apiKey?: string },
  ): AsyncGenerator<string, void, unknown> {
    const baseUrl = this.configApi.getString('librechat.baseUrl').replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/api/agents/v1/chat/completions`;

    if (!options?.apiKey) {
      throw new Error('No API key configured. Set one in Settings.');
    }
    if (!options?.agentId) {
      throw new Error('No agent selected. Pick one in Settings.');
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.agentId,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        (errorBody as { error?: string }).error ??
          `Backend returned ${response.status}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response stream available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines from the buffer
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === 'data: [DONE]') {
            return;
          }

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (typeof content === 'string' && content.length > 0) {
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
