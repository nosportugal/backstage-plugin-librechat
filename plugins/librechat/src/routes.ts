import { createRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'librechat',
});

export const adminRouteRef = createRouteRef({
  id: 'librechat-admin',
});
