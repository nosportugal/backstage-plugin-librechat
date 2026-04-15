import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import type {
  Conversation,
  Message,
  AgentConfig,
  AgentInfo,
  SendMessageResult,
  StreamCallbacks,
} from '@internal/plugin-librechat-common';
import { LibreChatApi } from './LibreChatApi';

export class LibreChatClient implements LibreChatApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  private async baseUrl(): Promise<string> {
    return await this.discoveryApi.getBaseUrl('librechat');
  }

  async createConversation(title?: string): Promise<Conversation> {
    const url = `${await this.baseUrl()}/conversations`;
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error(`Failed to create conversation: ${response.statusText}`);
    return response.json();
  }

  async listConversations(
    limit = 20,
    offset = 0,
  ): Promise<{ items: Conversation[]; totalCount: number }> {
    const url = `${await this.baseUrl()}/conversations?limit=${limit}&offset=${offset}`;
    const response = await this.fetchApi.fetch(url);
    if (!response.ok) throw new Error(`Failed to list conversations: ${response.statusText}`);
    return response.json();
  }

  async deleteConversation(id: string): Promise<void> {
    const url = `${await this.baseUrl()}/conversations/${encodeURIComponent(id)}`;
    const response = await this.fetchApi.fetch(url, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Failed to delete conversation: ${response.statusText}`);
  }

  async sendMessage(conversationId: string, content: string): Promise<SendMessageResult> {
    const url = `${await this.baseUrl()}/conversations/${encodeURIComponent(conversationId)}/messages`;
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error(`Failed to send message: ${response.statusText}`);
    return response.json();
  }

  async listMessages(
    conversationId: string,
    limit = 50,
    before?: string,
  ): Promise<{ items: Message[]; hasMore: boolean }> {
    let url = `${await this.baseUrl()}/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}`;
    if (before) url += `&before=${encodeURIComponent(before)}`;
    const response = await this.fetchApi.fetch(url);
    if (!response.ok) throw new Error(`Failed to list messages: ${response.statusText}`);
    return response.json();
  }

  streamResponse(streamUrl: string, callbacks: StreamCallbacks): () => void {
    const controller = new AbortController();

    (async () => {
      try {
        const baseUrl = await this.baseUrl();
        const url = `${baseUrl}${streamUrl}`;
        const response = await this.fetchApi.fetch(url, { signal: controller.signal });

        if (!response.ok || !response.body) {
          callbacks.onError?.({
            code: 'STREAM_FAILED',
            message: `Stream failed: ${response.statusText}`,
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                callbacks.onDone?.('');
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  callbacks.onToken?.(parsed.content);
                }
              } catch {
                // Skip non-JSON lines
              }
            }
          }
        }
        callbacks.onDone?.('');
      } catch (error) {
        if (!controller.signal.aborted) {
          callbacks.onError?.({
            code: 'STREAM_ERROR',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => controller.abort();
  }

  async getConfig(): Promise<AgentConfig> {
    const url = `${await this.baseUrl()}/admin/config`;
    const response = await this.fetchApi.fetch(url);
    if (!response.ok) throw new Error(`Failed to get config: ${response.statusText}`);
    return response.json();
  }

  async updateConfig(config: Partial<AgentConfig>): Promise<AgentConfig> {
    const url = `${await this.baseUrl()}/admin/config`;
    const response = await this.fetchApi.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error(`Failed to update config: ${response.statusText}`);
    return response.json();
  }

  async listAgents(): Promise<AgentInfo[]> {
    const url = `${await this.baseUrl()}/admin/agents`;
    const response = await this.fetchApi.fetch(url);
    if (!response.ok) throw new Error(`Failed to list agents: ${response.statusText}`);
    return response.json();
  }
}
