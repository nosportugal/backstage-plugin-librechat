import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';
import { createRouter } from './router';

/**
 * The LibreChat backend plugin.
 *
 * Proxies streaming chat requests to a LibreChat instance,
 * keeping API keys server-side.
 *
 * @public
 */
export const libreChatPlugin = createBackendPlugin({
  pluginId: 'librechat',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
      },
      async init({ logger, config, httpRouter }) {
        const baseUrl = config.getString('librechat.baseUrl');
        logger.info(`LibreChat plugin initialized, proxying to ${baseUrl}`);

        const router = createRouter({ logger, config });
        httpRouter.use(router);
        httpRouter.addAuthPolicy({
          path: '/',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
