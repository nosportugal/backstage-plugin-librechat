# Backstage Plugin: LibreChat AI Chat Bubble

A Backstage plugin that adds a floating AI chat bubble to your developer portal, powered by [LibreChat's Agents API](https://www.librechat.ai/docs/features/agents_api).

## Features

- **Floating Chat Bubble** — Persistent AI chat overlay across all Backstage pages
- **Streaming Responses** — Real-time SSE streaming from LibreChat agents
- **Markdown Rendering** — Full GitHub Flavored Markdown support in responses (code blocks, tables, lists, etc.)
- **Feature Flag Gated** — Users opt-in via Backstage's built-in Feature Flags (Settings → Feature Flags)
- **Secure Backend Proxy** — API keys stay server-side in `app-config.yaml`
- **User Overrides** — Users can provide their own API key and agent ID via in-chat settings

## Packages

| Package                                           | Description                                              |
| ------------------------------------------------- | -------------------------------------------------------- |
| `@nosportugal/backstage-plugin-librechat`         | Frontend plugin — chat bubble UI, settings, API client   |
| `@nosportugal/backstage-plugin-librechat-backend` | Backend plugin — proxies streaming requests to LibreChat |

## Architecture

```
User ↔ ChatBubble (frontend) → POST /api/librechat/chat (backend) → LibreChat Agents API (stream)
```

## Installation

### Backend

```typescript
// packages/backend/src/index.ts
import libreChatBackend from "@nosportugal/backstage-plugin-librechat-backend";

const backend = createBackend();
backend.add(libreChatBackend);
```

### Frontend

Install the package — the plugin auto-registers via the default export:

```typescript
// The plugin is automatically discovered when installed as a dependency.
// No code changes needed — just install the npm package.
```

### Configuration

Add to your `app-config.yaml`:

```yaml
librechat:
  # Required: URL of your LibreChat instance
  baseUrl: https://your-librechat-instance.com
  # Optional: Default API key (users can override in Settings)
  apiKey: your-librechat-api-key
  # Optional: Default agent ID (users can override in Settings)
  agentId: agent_abc123
```

### Enable the Feature Flag

1. Navigate to **Settings → Feature Flags** in Backstage
2. Toggle **librechat-chat-bubble** to ON
3. Refresh the page — the chat bubble appears in the bottom-right corner

## User Settings

Users can override the default API key and agent ID:

1. Click the chat bubble to open the panel
2. Click the ⚙️ settings icon in the header
3. Enter a custom API key and/or agent ID
4. Click **Save**

Settings are stored in the user's browser via Backstage's Storage API.

## Local Development

### Prerequisites

- Node.js 18+
- Yarn 4+
- A running LibreChat instance with the Agents API enabled

### Setup

```bash
# Install dependencies
yarn install

# Configure your LibreChat instance
# Edit app-config.yaml with your baseUrl, apiKey, and agentId

# Start the frontend dev server
yarn start

# In a separate terminal, start the backend
yarn start:backend
```

The frontend dev server runs at `http://localhost:3000`.

## LibreChat Setup

1. Enable the Agents API in your LibreChat instance (`librechat.yaml`):

```yaml
interface:
  remoteAgents:
    use: true
    create: true
```

2. Generate an API key from the LibreChat UI
3. Note the agent ID you want to use (visible in agent settings)
4. Add these to your Backstage `app-config.yaml`

## License

Apache-2.0
