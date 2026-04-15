import knexFactory, { Knex } from 'knex';
import { DatabaseManager } from '../src/database';
import { ConfigService } from '../src/service/ConfigService';

describe('ConfigService', () => {
  let db: Knex;
  let service: ConfigService;

  beforeAll(async () => {
    db = knexFactory({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await DatabaseManager.runMigrations(db);
    service = new ConfigService(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  afterEach(async () => {
    await db('agent_config').del();
  });

  describe('getConfig', () => {
    it('should return default config if none exists', async () => {
      const config = await service.getConfig();

      expect(config).toHaveProperty('agentId');
      expect(config).toHaveProperty('bubblePosition', 'bottom-right');
      expect(config).toHaveProperty('enabled', true);
      expect(config).toHaveProperty('allowedGroups');
    });

    it('should return saved config', async () => {
      await service.updateConfig(
        { greetingMessage: 'Welcome!', bubblePosition: 'bottom-left' },
        'user:default/admin',
      );

      const config = await service.getConfig();

      expect(config.greetingMessage).toBe('Welcome!');
      expect(config.bubblePosition).toBe('bottom-left');
    });
  });

  describe('updateConfig', () => {
    it('should create config if none exists', async () => {
      const config = await service.updateConfig(
        { greetingMessage: 'Hello!' },
        'user:default/admin',
      );

      expect(config.greetingMessage).toBe('Hello!');
      expect(config.updatedBy).toBe('user:default/admin');
    });

    it('should update existing config', async () => {
      await service.updateConfig({ greetingMessage: 'First' }, 'user:default/admin');
      const updated = await service.updateConfig(
        { greetingMessage: 'Second' },
        'user:default/admin',
      );

      expect(updated.greetingMessage).toBe('Second');
    });

    it('should validate bubble position', async () => {
      await expect(
        service.updateConfig({ bubblePosition: 'invalid' as never }, 'user:default/admin'),
      ).rejects.toThrow();
    });
  });
});
