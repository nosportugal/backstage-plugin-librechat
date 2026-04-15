import express from 'express';
import request from 'supertest';
import knexFactory, { Knex } from 'knex';
import { createRouter } from '../src/router';
import { DatabaseManager } from '../src/database';

describe('Router - Stream', () => {
  let app: express.Express;
  let db: Knex;
  let conversationId: string;

  beforeAll(async () => {
    db = knexFactory({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await DatabaseManager.runMigrations(db);

    const router = await createRouter({
      logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as never,
      config: {
        getOptionalString: jest.fn(() => undefined),
        getOptional: jest.fn(() => undefined),
        getString: jest.fn((key: string) => {
          if (key === 'librechat.baseUrl') return 'http://localhost:3080';
          if (key === 'librechat.apiKey') return 'test-key';
          if (key === 'librechat.agentId') return 'agent_test';
          return '';
        }),
      } as never,
      database: db,
      identity: {
        getIdentity: jest.fn().mockResolvedValue({
          identity: { userEntityRef: 'user:default/testuser' },
        }),
      },
      permissions: {},
    });

    app = express();
    app.use(express.json());
    app.use(router);

    const res = await request(app).post('/conversations').send({ title: 'Stream test' });
    conversationId = res.body.id;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('GET /conversations/:id/stream', () => {
    it('should return SSE content-type headers', async () => {
      // Add a message first
      await db('messages').insert({
        id: 'msg-stream-test',
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Test streaming response',
        status: 'delivered',
        created_at: new Date().toISOString(),
      });

      const res = await request(app).get(
        `/conversations/${conversationId}/stream?messageId=msg-stream-test`,
      );

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
    });

    it('should return 404 for non-existent conversation', async () => {
      const res = await request(app).get(
        '/conversations/00000000-0000-0000-0000-000000000000/stream?messageId=any',
      );

      expect(res.status).toBe(404);
    });
  });
});
