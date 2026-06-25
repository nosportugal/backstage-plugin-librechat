import {
  createFrontendPlugin,
  ApiBlueprint,
  AppRootElementBlueprint,
  fetchApiRef,
  configApiRef,
  createApiFactory,
} from "@backstage/frontend-plugin-api";
import {libreChatApiRef, DefaultLibreChatApi} from "./api";
import {ChatBubble} from "./components/ChatBubble";

/** Utility API extension providing the LibreChat API client. */
const libreChatApi = ApiBlueprint.make({
  name: "librechat",
  params: defineParams =>
    defineParams(
      createApiFactory({
        api: libreChatApiRef,
        deps: {fetchApi: fetchApiRef, configApi: configApiRef},
        factory: ({fetchApi, configApi}) =>
          new DefaultLibreChatApi({fetchApi, configApi}),
      }),
    ),
});

/** Global chat bubble overlay rendered across all pages. */
const chatBubbleRootElement = AppRootElementBlueprint.make({
  name: "chat-bubble",
  params: {
    element: <ChatBubble />,
  },
});

/**
 * The LibreChat frontend plugin.
 *
 * Provides an AI chat bubble overlay powered by LibreChat's Agents API.
 * Controlled via `librechat.enabled` config (defaults to true).
 *
 * @public
 */
export const libreChatPlugin = createFrontendPlugin({
  pluginId: "librechat",
  extensions: [libreChatApi, chatBubbleRootElement],
});
