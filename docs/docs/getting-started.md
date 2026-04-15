# Getting Started

## Prerequisites

- Node.js 18+
- Yarn 1.x
- A running Backstage instance
- A LibreChat instance with Agent API enabled

## Installation

```bash
# From your Backstage root
yarn add @internal/plugin-librechat @internal/plugin-librechat-backend @internal/plugin-librechat-common
```

## Backend Setup

In `packages/backend/src/index.ts`:

```typescript
backend.add(import('@internal/plugin-librechat-backend'));
```

## Frontend Setup

In `packages/app/src/App.tsx`, add the ChatBubble:

```tsx
import { ChatBubble } from '@internal/plugin-librechat';

// Inside your App component, at the root level:
<ChatBubble />;
```

Register the API factory in `packages/app/src/apis.ts`:

```typescript
import { libreChatApiRef, LibreChatClient } from '@internal/plugin-librechat';
import { discoveryApiRef, fetchApiRef, createApiFactory } from '@backstage/core-plugin-api';

export const apis = [
  createApiFactory({
    api: libreChatApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) => new LibreChatClient({ discoveryApi, fetchApi }),
  }),
];
```

## Configuration

Add to `app-config.yaml`:

```yaml
librechat:
  baseUrl: http://localhost:3080
  apiKey: ${LIBRECHAT_API_KEY}
  agentId: agent_your_agent_id
  database:
    client: better-sqlite3 # or 'pg'
    # For PostgreSQL:
    # connection:
    #   host: localhost
    #   port: 5432
    #   user: backstage
    #   password: ${POSTGRES_PASSWORD}
    #   database: backstage_librechat
```
