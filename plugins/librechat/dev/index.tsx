import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { createApiFactory, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import {
  libreChatPlugin,
  LibreChatPage,
  ChatBubble,
  libreChatApiRef,
  LibreChatClient,
} from '../src';

createDevApp()
  .registerPlugin(libreChatPlugin)
  .registerApi(
    createApiFactory({
      api: libreChatApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) => new LibreChatClient({ discoveryApi, fetchApi }),
    }),
  )
  .addPage({
    element: <LibreChatPage />,
    title: 'LibreChat Admin',
    path: '/librechat',
  })
  .addPage({
    element: (
      <div style={{ height: '100vh' }}>
        <h1>LibreChat Dev</h1>
        <p>The chat bubble should appear in the bottom-right corner.</p>
        <ChatBubble />
      </div>
    ),
    title: 'Chat Bubble Demo',
    path: '/librechat-demo',
  })
  .render();
