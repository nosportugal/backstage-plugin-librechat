# Backstage LibreChat Plugin

[![CI](https://github.com/nosportugal/backstage-plugin-librechat/actions/workflows/ci.yml/badge.svg)](https://github.com/nosportugal/backstage-plugin-librechat/actions/workflows/ci.yml)

A [Backstage](https://backstage.io) plugin that integrates [LibreChat](https://www.librechat.ai/) AI agents as a floating chat bubble widget, enabling conversational AI directly within your developer portal.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Backstage](https://img.shields.io/badge/Backstage-compatible-9cf)
![License](https://img.shields.io/badge/license-Apache--2.0-green)

## Features

- **Chat Bubble** — Floating FAB button that opens an embedded chat window on any Backstage page
- **Conversations** — Create, continue, and delete persistent conversation threads
- **Streaming Responses** — Real-time token-by-token AI response rendering via Server-Sent Events
- **Admin Panel** — Configure the connected agent, greeting message, bubble position, and access controls
- **Backstage Permissions** — Fine-grained access via `librechat.chat.use` and `librechat.admin.manage`
- **Database Persistence** — Conversations and messages stored via Knex (PostgreSQL or SQLite)

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Backstage App                                  │
│  ┌───────────┐  ┌────────────┐                  │
│  │ ChatBubble│  │ AdminPanel │  (frontend)      │
│  └─────┬─────┘  └─────┬──────┘                  │
│        └───────┬───────┘                         │
│          LibreChatClient                         │
└────────────────┬────────────────────────────────┘
                 │ REST + SSE
┌────────────────▼────────────────────────────────┐
│  librechat-backend                               │
│  ┌──────────────────┐  ┌─────────────────────┐  │
│  │ConversationService│  │ LibreChatService    │  │
│  └────────┬─────────┘  └─────────┬───────────┘  │
│           │                      │               │
│      Knex (DB)           openai SDK → LibreChat  │
└─────────────────────────────────────────────────┘
```

### Packages

| Package                     | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| `plugins/librechat-common`  | Shared TypeScript types and Backstage permission definitions   |
| `plugins/librechat`         | Frontend plugin — React components, hooks, API client          |
| `plugins/librechat-backend` | Backend plugin — Express routes, services, database migrations |

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn 1.x
- A running [Backstage](https://backstage.io/docs/getting-started/) instance
- A [LibreChat](https://www.librechat.ai/) instance with Agent API enabled

### Installation

```bash
# From your Backstage root
yarn add @internal/plugin-librechat @internal/plugin-librechat-backend @internal/plugin-librechat-common
```

### Backend Setup

Register the backend plugin in `packages/backend/src/index.ts`:

```typescript
backend.add(import('@internal/plugin-librechat-backend'));
```

### Frontend Setup

1. Add the chat bubble to your app in `packages/app/src/App.tsx`:

```tsx
import { ChatBubble } from '@internal/plugin-librechat';

// Inside your App component, at the root level:
<ChatBubble />;
```

2. Register the API factory in `packages/app/src/apis.ts`:

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

### Configuration

Add to your `app-config.yaml`:

```yaml
librechat:
  baseUrl: http://localhost:3080
  apiKey: ${LIBRECHAT_API_KEY}
  agentId: agent_your_agent_id
  database:
    client: better-sqlite3 # or 'pg' for PostgreSQL
```

<details>
<summary>PostgreSQL configuration</summary>

```yaml
librechat:
  baseUrl: http://localhost:3080
  apiKey: ${LIBRECHAT_API_KEY}
  agentId: agent_your_agent_id
  database:
    client: pg
    connection:
      host: localhost
      port: 5432
      user: backstage
      password: ${POSTGRES_PASSWORD}
      database: backstage_librechat
```

</details>

## Configuration Reference

| Key                         | Type     | Required | Default          | Description              |
| --------------------------- | -------- | -------- | ---------------- | ------------------------ |
| `librechat.baseUrl`         | `string` | Yes      | —                | LibreChat server URL     |
| `librechat.apiKey`          | `string` | Yes      | —                | API key for LibreChat    |
| `librechat.agentId`         | `string` | Yes      | —                | Default agent ID         |
| `librechat.database.client` | `string` | No       | `better-sqlite3` | `pg` or `better-sqlite3` |

## Permissions

| Permission               | Action   | Description                             |
| ------------------------ | -------- | --------------------------------------- |
| `librechat.chat.use`     | `read`   | Access to use the chat bubble           |
| `librechat.admin.manage` | `update` | Access to the admin configuration panel |

## API Endpoints

| Method   | Path                          | Description             |
| -------- | ----------------------------- | ----------------------- |
| `GET`    | `/health`                     | Health check            |
| `POST`   | `/conversations`              | Create a conversation   |
| `GET`    | `/conversations`              | List user conversations |
| `DELETE` | `/conversations/:id`          | Delete a conversation   |
| `POST`   | `/conversations/:id/messages` | Send a message          |
| `GET`    | `/conversations/:id/messages` | List messages           |
| `GET`    | `/conversations/:id/stream`   | SSE streaming response  |
| `GET`    | `/admin/config`               | Get admin config        |
| `PUT`    | `/admin/config`               | Update admin config     |
| `GET`    | `/admin/agents`               | List available agents   |

## Development

```bash
git clone https://github.com/nosportugal/backstage-plugin-librechat.git
cd backstage-plugin-librechat
yarn install
```

### Commands

| Command              | Description              |
| -------------------- | ------------------------ |
| `yarn build`         | Build all packages       |
| `yarn test`          | Run all tests            |
| `yarn test:coverage` | Run tests with coverage  |
| `yarn lint`          | Lint all packages        |
| `yarn typecheck`     | TypeScript type checking |
| `yarn format`        | Format with Prettier     |

### Docker

```bash
cd docker
cp .env.example .env
# Edit .env with your values
docker compose up
```

## Documentation

Full documentation is available in the [`docs/`](docs/) directory:

- [Getting Started](docs/docs/getting-started.md)
- [Configuration Reference](docs/docs/configuration.md)
- [Admin Guide](docs/docs/admin-guide.md)
- [Architecture Overview](docs/docs/architecture.md)
- [Development Guide](docs/docs/development.md)

## Tech Stack

- **TypeScript 5.4** (strict mode)
- **React 18** + Material UI v5
- **Backstage** core-plugin-api / backend-plugin-api
- **Knex** — PostgreSQL and SQLite support
- **OpenAI SDK** — LibreChat-compatible client
- **Jest 29** + React Testing Library + supertest

## License

Apache-2.0 — see [LICENSE](LICENSE) for details.
