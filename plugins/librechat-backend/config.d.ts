/**
 * Configuration schema for the LibreChat backend plugin.
 *
 * @param librechat - LibreChat plugin configuration
 */
export interface Config {
  librechat: {
    /**
     * Whether the chat bubble is enabled by default.
     * When true, the bubble shows without needing the feature flag.
     * @visibility frontend
     */
    enabled?: boolean;

    /**
     * Base URL of the LibreChat instance.
     * @visibility backend
     */
    baseUrl: string;

    /**
     * Default API key for authenticating with LibreChat.
     * Users can override this in the Backstage UI settings.
     * @visibility secret
     */
    apiKey?: string;

    /**
     * Agent ID to use for chat completions.
     * @visibility backend
     */
    agentId: string;

    /**
     * Allows unauthenticated access to backend endpoints.
     *
     * Defaults to false (recommended). Enable only when your Backstage
     * instance itself is already restricted and you explicitly want this
     * plugin route to be public. Cannot be combined with auth.method 'oidc'.
     * @visibility backend
     */
    allowUnauthenticated?: boolean;

    /**
     * Authentication used when calling the LibreChat Agents API.
     * Omitting this block preserves the original API-key behaviour.
     */
    auth?: {
      /**
       * 'apiKey' (default) — users supply their own LibreChat API key in the
       * chat settings, or the backend falls back to librechat.apiKey.
       *
       * 'oidc' — users sign in with the configured OIDC provider; the backend
       * holds refresh tokens and injects access tokens server-side. Requires
       * the LibreChat instance to enable endpoints.agents.remoteApi.auth.oidc.
       * @visibility frontend
       */
      method?: "apiKey" | "oidc";

      /**
       * OIDC settings. Required when method is 'oidc', ignored otherwise.
       */
      oidc?: {
        /**
         * OIDC issuer URL, e.g. https://login.microsoftonline.com/<tenant>/v2.0.
         * Must serve a discovery document at
         * <issuer>/.well-known/openid-configuration.
         * @visibility frontend
         */
        issuer: string;

        /**
         * Client ID of the public OAuth app registration used for the PKCE flow.
         * @visibility frontend
         */
        clientId: string;

        /**
         * Expected audience of access tokens. Must match the audience configured
         * in LibreChat's endpoints.agents.remoteApi.auth.oidc.audience.
         * @visibility frontend
         */
        audience: string;

        /**
         * Scopes requested during sign-in.
         * Defaults to ['openid', 'profile', 'email', 'offline_access'].
         * @visibility frontend
         */
        scopes?: string[];
      };
    };
  };
}
