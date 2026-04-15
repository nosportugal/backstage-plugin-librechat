import React from 'react';
import { createDevApp } from '@backstage/frontend-dev-utils';
import {
  createFrontendPlugin,
  createFrontendModule,
  PageBlueprint,
  ApiBlueprint,
  createRouteRef,
  fetchApiRef,
  configApiRef,
  createApiFactory,
} from '@backstage/frontend-plugin-api';
import libreChatPlugin from '../src';
import { libreChatApiRef, DefaultLibreChatApi } from '../src/api';
import { ChatBubble } from '../src/components/ChatBubble';

const devRouteRef = createRouteRef();

const devPage = PageBlueprint.make({
  name: 'home',
  params: {
    defaultPath: '/',
    routeRef: devRouteRef,
    loader: async () => (
      <div style={{ padding: 32 }}>
        <h1>LibreChat Plugin Dev</h1>
        <p>Look for the chat bubble in the bottom-right corner.</p>
        <ChatBubble />
      </div>
    ),
  },
});

/** Register the LibreChat API explicitly for the dev app */
const devLibreChatApi = ApiBlueprint.make({
  name: 'librechat',
  params: {
    factory: createApiFactory({
      api: libreChatApiRef,
      deps: { fetchApi: fetchApiRef, configApi: configApiRef },
      factory: ({ fetchApi, configApi }) =>
        new DefaultLibreChatApi({ fetchApi, configApi }),
    }),
  },
});

const devPlugin = createFrontendPlugin({
  pluginId: 'dev',
  extensions: [devPage, devLibreChatApi],
  routes: { root: devRouteRef },
});

createDevApp({ features: [libreChatPlugin, devPlugin] });
