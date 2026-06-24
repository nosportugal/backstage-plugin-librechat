# @nosportugal/backstage-plugin-librechat-backend

> Backend plugin that proxies chat requests from Backstage to a [LibreChat](https://www.librechat.ai/) instance, keeping API keys server-side.

This is the **backend** half of the LibreChat plugin. It exposes an HTTP route that the frontend plugin calls, forwards requests to the LibreChat Agents API, and streams the response back. Your default API key and agent ID stay on the server and are never exposed to the browser.

It must be paired with the frontend plugin, [`@nosportugal/backstage-plugin-librechat`](../librechat/README.md), which renders the chat bubble UI **and holds the full configuration reference**.

## Installation

Install the package in your Backstage backend package:

```bash
yarn --cwd packages/backend add @nosportugal/backstage-plugin-librechat-backend
```

## Setup

Add the plugin to your backend:

```typescript
// packages/backend/src/index.ts
import {createBackend} from "@backstage/backend-defaults";

const backend = createBackend();

// ...other plugins
backend.add(import("@nosportugal/backstage-plugin-librechat-backend"));

backend.start();
```

> [!NOTE]
> Configuration, endpoints, and architecture are documented in the [frontend plugin README](../librechat/README.md).
