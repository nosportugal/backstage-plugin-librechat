import express from 'express';
import request from 'supertest';
import knexFactory, { Knex } from 'knex';
import { createRouter } from '../src/router';
import { DatabaseManager } from '../src/database';

describe('Router - Admin', () => {
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
          identity: { userEntityRef: 'user:default/admin' },
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

  describe('GET /admin/config', () => {
    it('should return the current agent config', async () => {
      const res = await request(app).get('/admin/config');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('agentId');
      expect(res.body).toHaveProperty('bubblePosition');
      expect(res.body).toHaveProperty('enabled');
    });
  });

  describe('PUT /admin/config', () => {
    it('should update config and return the updated version', async () => {
      const res = await request(app).put('/admin/config').send({
        greetingMessage: 'Hello! How can I help?',
        bubblePosition: 'bottom-left',
      });

      expect(res.status).toBe(200);
      expect(res.body.greetingMessage).toBe('Hello! How can I help?');
      expect(res.body.bubblePosition).toBe('bottom-left');
    });

    it('should reject invalid bubble position', async () => {
      const res = await request(app).put('/admin/config').send({ bubblePosition: 'top-center' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /admin/agents', () => {
    it('should return a list of available agents', async () => {
      const res = await request(app).get('/admin/agents');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
