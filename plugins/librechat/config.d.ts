export interface Config {
  librechat?: {
    /**
     * Whether the chat bubble is enabled by default.
     * When true, the bubble shows without needing the feature flag.
     * @visibility frontend
     */
    enabled?: boolean;

    /**
     * Base URL of the LibreChat instance.
     * @visibility frontend
     */
    baseUrl?: string;
  };
}
