import { DatabaseManager } from './DatabaseManager';

describe('DatabaseManager', () => {
  describe('create', () => {
    it('should create a Knex instance with better-sqlite3 client', () => {
      const config = {
        getOptionalString: jest.fn((key: string) => {
          if (key === 'librechat.database.client') return 'better-sqlite3';
          if (key === 'librechat.database.connection.filename') return ':memory:';
          return undefined;
        }),
        getOptional: jest.fn(),
        getString: jest.fn((key: string) => {
          if (key === 'librechat.database.client') return 'better-sqlite3';
          return '';
        }),
      };

      const knex = DatabaseManager.create(config as never);
      expect(knex).toBeDefined();
      expect(knex.client.config.client).toBe('better-sqlite3');
    });

    it('should default to in-memory SQLite when no config is provided', () => {
      const config = {
        getOptionalString: jest.fn(() => undefined),
        getOptional: jest.fn(() => undefined),
        getString: jest.fn(() => ''),
      };

      const knex = DatabaseManager.create(config as never);
      expect(knex).toBeDefined();
      expect(knex.client.config.client).toBe('better-sqlite3');
    });

    it('should create a Knex instance with pg client', () => {
      const config = {
        getOptionalString: jest.fn((key: string) => {
          if (key === 'librechat.database.client') return 'pg';
          if (key === 'librechat.database.connection.host') return 'localhost';
          return undefined;
        }),
        getOptional: jest.fn((key: string) => {
          if (key === 'librechat.database.connection') {
            return {
              host: 'localhost',
              port: 5432,
              user: 'backstage',
              password: 'pass',
              database: 'backstage_librechat',
            };
          }
          return undefined;
        }),
        getString: jest.fn((key: string) => {
          if (key === 'librechat.database.client') return 'pg';
          return '';
        }),
      };

      const knex = DatabaseManager.create(config as never);
      expect(knex).toBeDefined();
      expect(knex.client.config.client).toBe('pg');
    });
  });

  describe('runMigrations', () => {
    it('should run migrations without error on in-memory SQLite', async () => {
      const config = {
        getOptionalString: jest.fn(() => undefined),
        getOptional: jest.fn(() => undefined),
        getString: jest.fn(() => ''),
      };

      const knex = DatabaseManager.create(config as never);
      await expect(DatabaseManager.runMigrations(knex)).resolves.not.toThrow();
      await knex.destroy();
    });
  });
});
