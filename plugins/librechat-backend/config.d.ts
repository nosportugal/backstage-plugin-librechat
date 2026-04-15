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
     * Default agent ID to use for chat completions.
     * Users can override this in the Backstage UI settings.
     * @visibility backend
     */
    agentId?: string;
  };
}
