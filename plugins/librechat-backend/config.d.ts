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
     * plugin route to be public.
     * @visibility backend
     */
    allowUnauthenticated?: boolean;
  };
}
