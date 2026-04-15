import express from 'express';
import request from 'supertest';
import knexFactory, { Knex } from 'knex';
import { createRouter } from '../src/router';
import { DatabaseManager } from '../src/database';

describe('Router - Conversations', () => {
  let app: express.Express;
  let db: Knex;

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
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /conversations', () => {
    it('should create a new conversation and return 201', async () => {
      const res = await request(app).post('/conversations').send({ title: 'Test conversation' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('userId', 'user:default/testuser');
      expect(res.body).toHaveProperty('title', 'Test conversation');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('should create a conversation without a title', async () => {
      const res = await request(app).post('/conversations').send({});

      expect(res.status).toBe(201);
      expect(res.body.title).toBeNull();
    });
  });

  describe('GET /conversations', () => {
    it('should return a list of conversations for the user', async () => {
      const res = await request(app).get('/conversations');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('totalCount');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('should support limit and offset query parameters', async () => {
      const res = await request(app).get('/conversations?limit=1&offset=0');

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeLessThanOrEqual(1);
    });
  });

  describe('DELETE /conversations/:id', () => {
    it('should delete a conversation and return 204', async () => {
      const createRes = await request(app).post('/conversations').send({ title: 'To delete' });
      const id = createRes.body.id;

      const res = await request(app).delete(`/conversations/${id}`);
      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent conversation', async () => {
      const res = await request(app).delete('/conversations/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });
});
