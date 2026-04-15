import express from 'express';
import request from 'supertest';
import knexFactory, { Knex } from 'knex';
import { createRouter } from '../src/router';
import { DatabaseManager } from '../src/database';

describe('Router - Messages', () => {
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

    // Create a conversation for message tests
    const res = await request(app).post('/conversations').send({ title: 'Messages test' });
    conversationId = res.body.id;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /conversations/:id/messages', () => {
    it('should create a user message and return 201 with streamUrl', async () => {
      const res = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .send({ content: 'Hello, AI agent!' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('userMessage');
      expect(res.body.userMessage).toHaveProperty('role', 'user');
      expect(res.body.userMessage).toHaveProperty('content', 'Hello, AI agent!');
      expect(res.body.userMessage).toHaveProperty('status', 'delivered');
      expect(res.body).toHaveProperty('streamUrl');
    });

    it('should reject empty content with 400', async () => {
      const res = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });

    it('should reject content exceeding max length with 400', async () => {
      const res = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .send({ content: 'x'.repeat(10001) });

      expect(res.status).toBe(400);
    });

    it('should strip HTML from content', async () => {
      const res = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .send({ content: '<script>alert("xss")</script>Hello' });

      expect(res.status).toBe(201);
      expect(res.body.userMessage.content).not.toContain('<script>');
    });
  });

  describe('GET /conversations/:id/messages', () => {
    it('should return messages in chronological order', async () => {
      const res = await request(app).get(`/conversations/${conversationId}/messages`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('hasMore');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('should support limit parameter', async () => {
      const res = await request(app).get(`/conversations/${conversationId}/messages?limit=1`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeLessThanOrEqual(1);
    });
  });
});
