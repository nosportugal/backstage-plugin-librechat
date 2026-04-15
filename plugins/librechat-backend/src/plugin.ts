import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { DatabaseManager } from './database';

export const libreChatPlugin = createBackendPlugin({
  pluginId: 'librechat',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
        identity: coreServices.identity,
        permissions: coreServices.permissions,
      },
      async init({ logger, config, httpRouter, identity, permissions }) {
        const db = DatabaseManager.create(config);
        await DatabaseManager.runMigrations(db);

        const router = await createRouter({
          logger,
          config,
          database: db,
          identity: identity as any,
          permissions,
        });

        httpRouter.use(router);
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
