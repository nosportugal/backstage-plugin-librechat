# @nospt/backstage-plugin-librechat

> Frontend plugin that adds an AI chat bubble to your Backstage app, powered by the [LibreChat](https://www.librechat.ai/) Agents API.

This is the **frontend** half of the LibreChat plugin. It renders a floating chat bubble across every page of your Backstage app, captures the context of the page you're viewing, streams responses in real time, and renders them as Markdown.

It must be paired with the backend plugin, [`@nospt/backstage-plugin-librechat-backend`](../librechat-backend/README.md), which proxies requests to LibreChat and keeps your API keys server-side.

## Features

- **Floating chat bubble** — persistent AI chat overlay on every Backstage page.
- **Page context awareness** — automatically shares the current page title, path, and URL with the agent.
- **Streaming responses** — real-time SSE streaming from the LibreChat Agents API.
- **Markdown rendering** — full GitHub Flavored Markdown (code blocks, tables, lists).
- **In-chat settings** — users can supply their own API key, validate it, and override the default.

## Prerequisites

- A Backstage app using the **[new frontend system](https://backstage.io/docs/frontend-system/)** (`@backstage/frontend-defaults`).
- The backend plugin [`@nospt/backstage-plugin-librechat-backend`](../librechat-backend/README.md) installed and configured.
- A running [LibreChat](https://www.librechat.ai/) instance with the Agents API enabled.

## Installation

Install the package in your Backstage app package (e.g. `packages/app`):

```bash
yarn --cwd packages/app add @nospt/backstage-plugin-librechat
```

## Setup

Register the plugin as a feature in your app entry point. With the new frontend system it is discovered automatically when listed in `package.json`, but you can also add it explicitly:

```typescript
// packages/app/src/App.tsx
import {createApp} from "@backstage/frontend-defaults";
import libreChatPlugin from "@nospt/backstage-plugin-librechat";

const app = createApp({
  features: [libreChatPlugin],
});

export default app.createRoot();
```

The plugin contributes an app-root overlay (the chat bubble), so there is no route or page to mount — once registered, the bubble appears in the bottom-right corner of every page.

## Configuration

All configuration for both the frontend and backend plugins lives under the `librechat` key in `app-config.yaml`:

```yaml
librechat:
  # Required: URL of your LibreChat instance (used by frontend and backend)
  baseUrl: https://your-librechat-instance.com
  # Required: agent ID configured in LibreChat (used as the completion model)
  agentId: agent_abc123
  # Optional: default API key — users can override it in the chat Settings
  apiKey: your-librechat-api-key
  # Optional: display name shown in the chat header and message labels (default: "AI")
  name: NOS-GPT
  # Optional: custom chat bubble icon from a local image in your app's static assets (served path, relative to app.baseUrl)
  iconPath: /chat-icon.png
  # Optional: help text above the API key field in Settings (supports [label](url) links)
  apiKeyDescription: "You can set up your LibreChat key [here](https://example.com/key)."
  # Optional: show/hide the chat bubble (default: true)
  enabled: true
```

| Setting             | Required | Visibility | Description                                                                                                    |
| ------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `baseUrl`           | ✅       | frontend   | URL of your LibreChat instance                                                                                 |
| `agentId`           | ✅       | backend    | Agent ID configured in LibreChat, used as the completion model                                                 |
| `apiKey`            | ❌       | secret     | Default API key; users can override it per-request from the chat UI                                            |
| `name`              | ❌       | frontend   | Display name in the chat header and messages (default: `AI`)                                                   |
| `iconPath`          | ❌       | frontend   | Custom bubble icon from a local image in static assets (e.g. `/chat-icon.png`, resolved against `app.baseUrl`) |
| `apiKeyDescription` | ❌       | frontend   | Help text above the API key field in Settings; supports `[label](url)` links                                   |
| `enabled`           | ❌       | frontend   | Show or hide the chat bubble (default: `true`)                                                                 |

> [!NOTE]
> `agentId` and `apiKey` are only read server-side by the backend plugin and are never exposed to the browser. `baseUrl`, `name`, and `enabled` are visible to the frontend.

## Endpoints

The backend plugin mounts under `/api/librechat`:

| Method | Path     | Description                                                               |
| ------ | -------- | ------------------------------------------------------------------------- |
| `POST` | `/chat`  | Proxies a chat completion to LibreChat and streams the SSE response back. |
| `POST` | `/check` | Validates an API key by sending a short test message to LibreChat.        |

Both accept optional `x-librechat-api-key` and `x-librechat-agent-id` headers to override the configured defaults.

## How it works

```
Frontend bubble → POST /api/librechat/chat → LibreChat /api/agents/v1/chat/completions → SSE stream back
```

The backend resolves the API key (a user-supplied header takes precedence over the configured default), validates the request, sanitizes the agent ID, and proxies it to `POST {baseUrl}/api/agents/v1/chat/completions`. The streamed response is piped back to the frontend untouched, where it is rendered as Markdown in real time.

## Usage

1. Open any page in Backstage.
2. Click the **chat bubble** in the bottom-right corner.
3. Open **Settings** to enter your LibreChat API key (or use the default configured by your admin).
4. Click the **check** button to validate your key — a confirmation message appears in the chat.
5. Start chatting — the AI automatically receives context about the page you're viewing.

User settings (the API key) are stored in the browser via Backstage's Storage API.

## License

Apache-2.0. Made with ❤️ by [NOS Inovação](https://github.com/nosportugal).
