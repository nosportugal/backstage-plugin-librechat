import React from "react";
import {createDevApp} from "@backstage/frontend-dev-utils";
import {
  createFrontendPlugin,
  PageBlueprint,
  createRouteRef,
} from "@backstage/frontend-plugin-api";
import libreChatPlugin from "../src";
import {ChatBubble} from "../src/components/ChatBubble";

const devRouteRef = createRouteRef();

const devPage = PageBlueprint.make({
  name: "home",
  params: {
    path: "/",
    routeRef: devRouteRef,
    loader: async () => (
      <div style={{padding: 32}}>
        <h1>LibreChat Plugin Dev</h1>
        <p>Look for the chat bubble in the bottom-right corner.</p>
        <ChatBubble />
      </div>
    ),
  },
});

const devPlugin = createFrontendPlugin({
  pluginId: "dev",
  extensions: [devPage],
  routes: {root: devRouteRef},
});

createDevApp({features: [libreChatPlugin, devPlugin]});
