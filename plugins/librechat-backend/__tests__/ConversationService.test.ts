import knexFactory, { Knex } from 'knex';
import { DatabaseManager } from '../src/database';
import { ConversationService } from '../src/service/ConversationService';

describe('ConversationService', () => {
  let db: Knex;
  let service: ConversationService;

  beforeAll(async () => {
    db = knexFactory({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await DatabaseManager.runMigrations(db);
    service = new ConversationService(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  afterEach(async () => {
    await db('messages').del();
    await db('conversations').del();
  });

  describe('create', () => {
    it('should create a conversation and return it', async () => {
      const conv = await service.create('user:default/john', 'agent_123', 'Test');

      expect(conv).toHaveProperty('id');
      expect(conv.userId).toBe('user:default/john');
      expect(conv.agentId).toBe('agent_123');
      expect(conv.title).toBe('Test');
    });

    it('should create a conversation without a title', async () => {
      const conv = await service.create('user:default/john', 'agent_123');

      expect(conv.title).toBeNull();
    });
  });

  describe('list', () => {
    it('should return conversations for a specific user', async () => {
      await service.create('user:default/john', 'agent_123', 'Conv 1');
      await service.create('user:default/john', 'agent_123', 'Conv 2');
      await service.create('user:default/jane', 'agent_123', 'Conv 3');

      const result = await service.list('user:default/john');

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should order by updated_at descending', async () => {
      await service.create('user:default/john', 'agent_123', 'First');
      await service.create('user:default/john', 'agent_123', 'Second');

      const result = await service.list('user:default/john');

      expect(result.items[0].title).toBe('Second');
    });

    it('should support limit and offset', async () => {
      await service.create('user:default/john', 'agent_123', 'Conv 1');
      await service.create('user:default/john', 'agent_123', 'Conv 2');
      await service.create('user:default/john', 'agent_123', 'Conv 3');

      const result = await service.list('user:default/john', 1, 1);

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(3);
    });
  });

  describe('getById', () => {
    it('should return a conversation by ID', async () => {
      const created = await service.create('user:default/john', 'agent_123', 'Find me');

      const found = await service.getById(created.id, 'user:default/john');

      expect(found).not.toBeNull();
      expect(found!.title).toBe('Find me');
    });

    it('should return null for wrong user', async () => {
      const created = await service.create('user:default/john', 'agent_123');

      const found = await service.getById(created.id, 'user:default/jane');

      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a conversation', async () => {
      const created = await service.create('user:default/john', 'agent_123');

      const deleted = await service.delete(created.id, 'user:default/john');

      expect(deleted).toBe(true);
    });

    it('should return false for non-existent conversation', async () => {
      const deleted = await service.delete(
        '00000000-0000-0000-0000-000000000000',
        'user:default/john',
      );

      expect(deleted).toBe(false);
    });
  });
});
