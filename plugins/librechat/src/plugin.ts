import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';
import { rootRouteRef, adminRouteRef } from './routes';

export const libreChatPlugin = createPlugin({
  id: 'librechat',
  routes: {
    root: rootRouteRef,
    admin: adminRouteRef,
  },
});

export const LibreChatPage = libreChatPlugin.provide(
  createRoutableExtension({
    name: 'LibreChatPage',
    component: () => import('./components/AdminPanel').then(m => m.AdminPanel) as any,
    mountPoint: adminRouteRef,
  }),
);
