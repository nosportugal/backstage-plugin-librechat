/**
 * Shared TypeScript interfaces for the LibreChat Backstage plugin.
 * Used by frontend, backend, and common packages.
 */

export interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'sending' | 'delivered' | 'error';
  createdAt: string;
}

export interface AgentConfig {
  agentId: string;
  greetingMessage: string | null;
  bubblePosition: 'bottom-right' | 'bottom-left';
  enabled: boolean;
  allowedGroups: string[];
  updatedAt: string;
  updatedBy: string;
}

export interface AgentInfo {
  id: string;
  name: string;
}

export interface SendMessageResult {
  userMessage: Message;
  streamUrl: string;
}

export interface StreamCallbacks {
  onToken: (content: string) => void;
  onDone: (messageId: string) => void;
  onError: (error: { code: string; message: string }) => void;
}

export type BubblePosition = 'bottom-right' | 'bottom-left';
export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'sending' | 'delivered' | 'error';
