import { Knex } from 'knex';
import type { AgentConfig, BubblePosition } from '@internal/plugin-librechat-common';

const VALID_POSITIONS: BubblePosition[] = ['bottom-right', 'bottom-left'];

export class ConfigService {
  constructor(private readonly db: Knex) {}

  async getConfig(): Promise<AgentConfig> {
    const row = await this.db('agent_config').where('id', 1).first();

    if (!row) {
      return {
        agentId: '',
        greetingMessage: 'Hello! How can I help you today?',
        bubblePosition: 'bottom-right',
        enabled: true,
        allowedGroups: [],
        updatedAt: new Date().toISOString(),
        updatedBy: '',
      };
    }

    return {
      agentId: row.agent_id ?? '',
      greetingMessage: row.greeting_message ?? '',
      bubblePosition: (row.bubble_position as BubblePosition) ?? 'bottom-right',
      enabled: Boolean(row.enabled),
      allowedGroups: JSON.parse(row.allowed_groups || '[]'),
      updatedAt: row.updated_at,
      updatedBy: row.updated_by ?? '',
    };
  }

  async updateConfig(updates: Partial<AgentConfig>, updatedBy: string): Promise<AgentConfig> {
    if (updates.bubblePosition && !VALID_POSITIONS.includes(updates.bubblePosition)) {
      throw new Error(
        `Invalid bubble position: ${updates.bubblePosition}. Must be one of: ${VALID_POSITIONS.join(', ')}`,
      );
    }

    const now = new Date().toISOString();
    const existing = await this.db('agent_config').where('id', 1).first();

    const data: Record<string, unknown> = {
      updated_at: now,
      updated_by: updatedBy,
    };
    if (updates.agentId !== undefined) data.agent_id = updates.agentId;
    if (updates.greetingMessage !== undefined) data.greeting_message = updates.greetingMessage;
    if (updates.bubblePosition !== undefined) data.bubble_position = updates.bubblePosition;
    if (updates.enabled !== undefined) data.enabled = updates.enabled;
    if (updates.allowedGroups !== undefined)
      data.allowed_groups = JSON.stringify(updates.allowedGroups);

    if (existing) {
      await this.db('agent_config').where('id', 1).update(data);
    } else {
      await this.db('agent_config').insert({ id: 1, ...data });
    }

    return this.getConfig();
  }
}
