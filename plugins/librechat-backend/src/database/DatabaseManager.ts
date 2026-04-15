import knexFactory, { Knex } from 'knex';
import path from 'path';

export class DatabaseManager {
  static create(config: {
    getOptionalString: (key: string) => string | undefined;
    getOptional: (key: string) => unknown;
  }): Knex {
    const client = config.getOptionalString('librechat.database.client') || 'better-sqlite3';

    if (client === 'pg') {
      const connection = config.getOptional('librechat.database.connection') as
        | Record<string, unknown>
        | undefined;
      return knexFactory({
        client: 'pg',
        connection: connection || {
          host: 'localhost',
          port: 5432,
          user: 'backstage',
          password: '',
          database: 'backstage_librechat',
        },
        useNullAsDefault: true,
      });
    }

    const filename =
      config.getOptionalString('librechat.database.connection.filename') || ':memory:';
    return knexFactory({
      client: 'better-sqlite3',
      connection: { filename },
      useNullAsDefault: true,
    });
  }

  static async runMigrations(knex: Knex): Promise<void> {
    await knex.migrate.latest({
      directory: path.join(__dirname, 'migrations'),
      loadExtensions: ['.js'],
    });
  }
}
