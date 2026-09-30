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
- **Local conversation history** — completed conversations are saved per signed-in user in the browser via Backstage's Storage API; the five most recently used conversations are retained.
- **History controls** — reopen the last active chat, start a new chat, switch conversations, delete individual conversations, or delete all local history.

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
  # Optional: allow unauthenticated access to /api/librechat/* (default: false)
  # WARNING: set true only if you intentionally want a public plugin route.
  # Cannot be combined with auth.method: oidc.
  allowUnauthenticated: false
  # Optional: authentication method for the LibreChat Agents API (default: apiKey)
  auth:
    method: oidc
    oidc:
      issuer: https://login.microsoftonline.com/<tenant-id>/v2.0
      clientId: <app-registration-client-id>
      audience: api://librechat-agents
      # Optional, defaults shown:
      scopes: [openid, profile, email, offline_access]
```

## OIDC authentication

By default the plugin authenticates to LibreChat with API keys (`auth.method: apiKey`, the original behaviour). Setting `auth.method: oidc` switches the deployment to OpenID Connect: users click **Sign in** in the chat Settings tab, complete a PKCE flow in a popup, and the backend holds the resulting refresh token — injecting access tokens into upstream calls itself, so token material never reaches the browser.

Two sides must be configured consistently:

1. **Your OIDC provider** — register a public client (no client secret) with the redirect URI `https://<your-backstage>/api/librechat/auth/callback` and grant the scopes above. For Microsoft Entra ID: create an app registration, expose an API scope, and use `api://<app-id>` as `audience`.
2. **LibreChat** — enable OIDC on the Agents API so it accepts your provider's tokens:

```yaml
# librechat.yaml
endpoints:
  agents:
    remoteApi:
      auth:
        oidc:
          enabled: true
          issuer: https://login.microsoftonline.com/<tenant-id>/v2.0
          audience: api://librechat-agents
```

LibreChat matches tokens to existing users by `sub`, then `email`, `preferred_username`, or `upn` — users must already exist in LibreChat. See the [LibreChat Agents API docs](https://www.librechat.ai/docs/features/agents_api#oidc-bearer-token) for details.

Behaviour notes:

- The auth method is deployment-wide, set by the adopter. In OIDC mode the Settings tab replaces the API key field with a Connection card, and any previously stored per-user key is removed.
- OIDC mode requires Backstage-authenticated plugin routes (sessions are bound to Backstage user identities). Combining `auth.method: oidc` with `allowUnauthenticated: true` fails backend startup.
- Access tokens are validated for issuer/audience/expiry before proxying; signature verification remains LibreChat's job. Expired sessions surface in the chat UI as a prompt to sign in again.
- Requires a LibreChat version whose beta Agents API supports `remoteApi.auth.oidc`.

| Setting                | Required | Visibility | Description                                                                                                    |
| ---------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `baseUrl`              | ✅       | frontend   | URL of your LibreChat instance                                                                                 |
| `agentId`              | ✅       | backend    | Agent ID configured in LibreChat, used as the completion model                                                 |
| `apiKey`               | ❌       | secret     | Default API key; users can override it per-request from the chat UI                                            |
| `name`                 | ❌       | frontend   | Display name in the chat header and messages (default: `AI`)                                                   |
| `iconPath`             | ❌       | frontend   | Custom bubble icon from a local image in static assets (e.g. `/chat-icon.png`, resolved against `app.baseUrl`) |
| `apiKeyDescription`    | ❌       | frontend   | Help text above the API key field in Settings; supports `[label](url)` links                                   |
| `enabled`              | ❌       | frontend   | Show or hide the chat bubble (default: `true`)                                                                 |
| `allowUnauthenticated` | ❌       | backend    | Allow anonymous access to plugin backend routes (default: `false`; enable only for trusted/dev setups)         |

> [!NOTE]
> `agentId` and `apiKey` are only read server-side by the backend plugin and are never exposed to the browser. `baseUrl`, `name`, and `enabled` are visible to the frontend.

> [!WARNING]
> By default, plugin backend routes require Backstage authentication. Setting `librechat.allowUnauthenticated: true` makes `/api/librechat/*` publicly accessible for this plugin.

## Endpoints

The backend plugin mounts under `/api/librechat`:

| Method | Path     | Description                                                               |
| ------ | -------- | ------------------------------------------------------------------------- |
| `POST` | `/chat`  | Proxies a chat completion to LibreChat and streams the SSE response back. |
| `POST` | `/check` | Validates the caller's credential by sending a short test message.        |

In `apiKey` mode both accept an optional `x-librechat-api-key` header to override the configured default. In `oidc` mode credential headers are ignored — the backend injects the caller's stored token.

OIDC mode additionally mounts `/api/librechat/auth/*`:

| Method | Path             | Description                                                 |
| ------ | ---------------- | ----------------------------------------------------------- |
| `GET`  | `/auth/start`    | Starts the PKCE flow; redirects the popup to the IdP.       |
| `GET`  | `/auth/callback` | IdP redirect target; posts the result to the opener window. |
| `GET`  | `/auth/status`   | Reports whether the caller has a live OIDC session.         |
| `POST` | `/auth/refresh`  | Mints a new access token from the stored refresh token.     |
| `POST` | `/auth/logout`   | Deletes the caller's stored session.                        |

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

Completed chat conversations are also stored locally per signed-in Backstage user. Only the five most recently used conversations are retained; no conversation data is sent to the plugin backend except the active transcript needed for the current request. Page context is attached to requests without being stored in the transcript.

## License

Apache-2.0. Made with ❤️ by [NOS Inovação](https://github.com/nosportugal).
