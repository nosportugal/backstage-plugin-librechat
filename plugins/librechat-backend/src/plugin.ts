import {createBackendPlugin, coreServices} from "@backstage/backend-plugin-api";
import {createRouter} from "./router";
import {createAuthRouter} from "./auth/authRouter";
import {readAuthConfig} from "./auth/config";
import {OidcClient} from "./auth/oidcClient";
import {OidcTokenStore} from "./auth/tokenStore";

/**
 * The LibreChat backend plugin.
 *
 * Proxies streaming chat requests to a LibreChat instance,
 * keeping API keys server-side. In OIDC mode it additionally holds
 * per-user refresh tokens and injects access tokens server-side.
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
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
        database: coreServices.database,
        discovery: coreServices.discovery,
      },
      async init({logger, config, httpRouter, auth, httpAuth, database, discovery}) {
        const baseUrl = config.getString("librechat.baseUrl");
        const allowUnauthenticated =
          config.getOptionalBoolean("librechat.allowUnauthenticated") ?? false;

        // Throws on misconfiguration (oidc + allowUnauthenticated, missing oidc block)
        const authConfig = readAuthConfig(config);
        logger.info(
          `LibreChat plugin initialized, proxying to ${baseUrl} (auth: ${authConfig.method})`,
        );

        let oidcDeps:
          | {tokenStore: OidcTokenStore; oidcClient: OidcClient; httpAuth: typeof httpAuth}
          | undefined;

        if (authConfig.method === "oidc") {
          const oidcClient = new OidcClient(authConfig.oidc!, logger);
          const tokenStore = await OidcTokenStore.create({database, logger});
          oidcDeps = {tokenStore, oidcClient, httpAuth};

          const pluginBaseUrl = await discovery.getBaseUrl("librechat");
          httpRouter.use(
            createAuthRouter({
              logger,
              oidc: authConfig.oidc!,
              oidcClient,
              tokenStore,
              auth,
              httpAuth,
              pluginBaseUrl,
            }),
          );
        }

        const router = createRouter({
          logger,
          config,
          authConfig,
          oidc: oidcDeps,
        });
        httpRouter.use(router);

        // Keep plugin endpoints authenticated by default.
        // Public mode is available as an explicit opt-in for local/dev setups
        // (and is rejected at startup when OIDC mode is configured).
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
