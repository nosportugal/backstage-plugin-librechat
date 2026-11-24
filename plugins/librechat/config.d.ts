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

    /**
     * Default placement of the chat bubble. A position the user sets by
     * dragging the bubble is saved per user and always takes precedence.
     */
    bubble?: {
      /**
       * Default placement on every page (default: bottom-right, 24px offsets).
       * @visibility frontend
       */
      position?: {
        /**
         * Viewport corner the offsets are measured from.
         * @visibility frontend
         */
        anchor?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
        /**
         * Distance in px from the anchored left/right edge (default: 24).
         * @visibility frontend
         */
        offsetX?: number;
        /**
         * Distance in px from the anchored top/bottom edge (default: 24).
         * @visibility frontend
         */
        offsetY?: number;
      };

      /**
       * Per-route placement overrides. `path` is a path prefix matched on
       * segment boundaries; the longest match wins. Paths are relative to the
       * app root: any sub-path in `app.baseUrl` is stripped before matching.
       * Unset fields fall back to `bubble.position`. When omitted, a built-in
       * override raises the bubble on `/search` (offsetY: 120) so it doesn't
       * cover the results pager; setting this list replaces that built-in (use
       * `[]` to disable it).
       * @visibility frontend
       */
      routes?: Array<{
        /** @visibility frontend */
        path: string;
        /** @visibility frontend */
        position?: {
          /** @visibility frontend */
          anchor?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
          /** @visibility frontend */
          offsetX?: number;
          /** @visibility frontend */
          offsetY?: number;
        };
      }>;
    };
  };
}
