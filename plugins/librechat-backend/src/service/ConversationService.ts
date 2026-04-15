import { Knex } from 'knex';
import { v4 as uuid } from 'uuid';
import type { Conversation } from '@internal/plugin-librechat-common';

export class ConversationService {
  constructor(private readonly db: Knex) {}

  async create(userId: string, agentId: string, title?: string): Promise<Conversation> {
    const id = uuid();
    const now = new Date().toISOString();

    await this.db('conversations').insert({
      id,
      user_id: userId,
      agent_id: agentId,
      title: title ?? null,
      created_at: now,
      updated_at: now,
    });

    return {
      id,
      userId,
      agentId,
      title: title ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async list(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ items: Conversation[]; totalCount: number }> {
    const countResult = await this.db('conversations')
      .where('user_id', userId)
      .count('* as count')
      .first();
    const totalCount = Number(countResult?.count ?? 0);

    const rows = await this.db('conversations')
      .where('user_id', userId)
      .orderBy('updated_at', 'desc')
      .limit(Math.min(limit, 100))
      .offset(offset);

    const items: Conversation[] = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { items, totalCount };
  }

  async getById(id: string, userId: string): Promise<Conversation | null> {
    const row = await this.db('conversations').where({ id, user_id: userId }).first();

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const count = await this.db('conversations').where({ id, user_id: userId }).del();
    return count > 0;
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    status: 'sending' | 'delivered' | 'error' = 'delivered',
  ) {
    const id = uuid();
    const now = new Date().toISOString();

    await this.db('messages').insert({
      id,
      conversation_id: conversationId,
      role,
      content,
      status,
      created_at: now,
    });

    await this.db('conversations').where('id', conversationId).update({ updated_at: now });

    return {
      id,
      conversationId,
      role,
      content,
      status,
      createdAt: now,
    };
  }

  async listMessages(
    conversationId: string,
    limit = 50,
    before?: string,
  ): Promise<{
    items: Array<{
      id: string;
      conversationId: string;
      role: string;
      content: string;
      status: string;
      createdAt: string;
    }>;
    hasMore: boolean;
  }> {
    let query = this.db('messages')
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'asc')
      .limit(Math.min(limit, 200) + 1);

    if (before) {
      const beforeMsg = await this.db('messages').where('id', before).first();
      if (beforeMsg) {
        query = query.where('created_at', '<', beforeMsg.created_at);
      }
    }

    const rows = await query;
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      conversationId: row.conversation_id as string,
      role: row.role as string,
      content: row.content as string,
      status: row.status as string,
      createdAt: row.created_at as string,
    }));

    return { items, hasMore };
  }
}
