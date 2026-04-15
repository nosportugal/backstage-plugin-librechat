import { createApiRef } from '@backstage/core-plugin-api';
import type {
  Conversation,
  Message,
  AgentConfig,
  AgentInfo,
  SendMessageResult,
  StreamCallbacks,
} from '@internal/plugin-librechat-common';

export interface LibreChatApi {
  createConversation(title?: string): Promise<Conversation>;
  listConversations(
    limit?: number,
    offset?: number,
  ): Promise<{ items: Conversation[]; totalCount: number }>;
  deleteConversation(id: string): Promise<void>;

  sendMessage(conversationId: string, content: string): Promise<SendMessageResult>;
  listMessages(
    conversationId: string,
    limit?: number,
    before?: string,
  ): Promise<{ items: Message[]; hasMore: boolean }>;

  streamResponse(streamUrl: string, callbacks: StreamCallbacks): () => void;

  getConfig(): Promise<AgentConfig>;
  updateConfig(config: Partial<AgentConfig>): Promise<AgentConfig>;
  listAgents(): Promise<AgentInfo[]>;
}

export const libreChatApiRef = createApiRef<LibreChatApi>({
  id: 'plugin.librechat.api',
});
