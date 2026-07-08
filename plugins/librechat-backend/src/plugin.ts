import {createBackendPlugin, coreServices} from "@backstage/backend-plugin-api";
import {createRouter} from "./router";

/**
 * The LibreChat backend plugin.
 *
 * Proxies streaming chat requests to a LibreChat instance,
 * keeping API keys server-side.
 *
 * @public
 */
export const libreChatPlugin = createBackendPlugin({
  pluginId: "librechat",
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
      },
      async init({logger, config, httpRouter}) {
        const baseUrl = config.getString("librechat.baseUrl");
        const allowUnauthenticated =
          config.getOptionalBoolean("librechat.allowUnauthenticated") ?? false;
        logger.info(`LibreChat plugin initialized, proxying to ${baseUrl}`);

        const router = createRouter({logger, config});
        httpRouter.use(router);

        // Keep plugin endpoints authenticated by default.
        // Public mode is available as an explicit opt-in for local/dev setups.
        if (allowUnauthenticated) {
          logger.warn(
            "LibreChat backend auth disabled via librechat.allowUnauthenticated=true; endpoints are publicly accessible.",
          );
          httpRouter.addAuthPolicy({
            path: "/",
            allow: "unauthenticated",
          });
        }
      },
    });
  },
});
