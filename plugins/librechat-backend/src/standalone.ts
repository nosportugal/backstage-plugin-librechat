import express from 'express';
import { createRouter } from './router';
import { DatabaseManager } from './database';

const port = Number(process.env.PORT) || 7007;

const configValues: Record<string, unknown> = {
  'librechat.baseUrl': process.env.LIBRECHAT_BASE_URL || 'http://localhost:3080',
  'librechat.apiKey': process.env.LIBRECHAT_API_KEY || '',
  'librechat.agentId': process.env.LIBRECHAT_AGENT_ID || 'default',
  'librechat.database.client': process.env.DB_CLIENT || 'pg',
  'librechat.database.connection': {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER || 'backstage',
    password: process.env.POSTGRES_PASSWORD || 'backstage',
    database: process.env.POSTGRES_DB || 'backstage_librechat',
  },
};

function getNestedValue(key: string): unknown {
  // Try exact match first
  if (key in configValues) return configValues[key];
  // Try dot-path traversal for nested keys like 'librechat.database.connection.filename'
  const parts = key.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const parentKey = parts.slice(0, i).join('.');
    const childPath = parts.slice(i);
    const parent = configValues[parentKey];
    if (parent && typeof parent === 'object') {
      let current: unknown = parent;
      for (const part of childPath) {
        if (
          current &&
          typeof current === 'object' &&
          part in (current as Record<string, unknown>)
        ) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return current;
    }
  }
  return undefined;
}

const config = {
  getString(key: string): string {
    const val = getNestedValue(key);
    if (val === undefined) throw new Error(`Missing config: ${key}`);
    return String(val);
  },
  getOptionalString(key: string): string | undefined {
    const val = getNestedValue(key);
    return val !== undefined ? String(val) : undefined;
  },
  getOptional(key: string): unknown {
    return getNestedValue(key);
  },
};

const logger = {
  info: (msg: string, ...args: unknown[]) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg: string, ...args: unknown[]) => console.debug(`[DEBUG] ${msg}`, ...args),
  child: () => logger,
};

const identity = {
  async getIdentity(_options: { request: express.Request }) {
    // In standalone mode, use a header or default user
    const userRef =
      (_options.request.headers['x-user-entity-ref'] as string) || 'user:default/guest';
    return { identity: { userEntityRef: userRef } };
  },
};

async function main() {
  const db = DatabaseManager.create(config);
  await DatabaseManager.runMigrations(db);

  const router = await createRouter({
    logger,
    config: config as any,
    database: db,
    identity,
    permissions: {},
  });

  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use('/api/librechat', router);
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.listen(port, '0.0.0.0', () => {
    logger.info(`LibreChat backend running on port ${port}`);
  });
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
