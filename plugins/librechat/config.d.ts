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

    /**
     * Display name for the chat agent.
     * Used in the chat header ("<name> Chat") and message labels.
     * @visibility frontend
     */
    name?: string;

    /**
     * Help text shown above the API key field in the chat Settings tab.
     * Supports Markdown-style links, e.g.
     * "Get your key [here](https://example.com/key).".
     * @visibility frontend
     */
    apiKeyDescription?: string;

    /**
     * Path to a local image (e.g. a PNG) used as the chat bubble icon.
     *
     * The image must be served from your app's static assets: place the file
     * in `packages/app/public` and set this to the served path, e.g.
     * "/chat-icon.png". Resolved relative to `app.baseUrl`. Absolute URLs and
     * `data:` URIs are also accepted. Falls back to the default chat icon when
     * not set.
     * @visibility frontend
     */
    iconPath?: string;
  };
}
