import { createPermission } from '@backstage/plugin-permission-common';

export const libreChatUsePermission = createPermission({
  name: 'librechat.chat.use',
  attributes: { action: 'read' },
});

export const libreChatAdminPermission = createPermission({
  name: 'librechat.admin.manage',
  attributes: { action: 'update' },
});
