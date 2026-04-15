# Development Guide

## Setup

```bash
git clone <repo-url>
cd backstage-plugin-librechat
yarn install
```

## Commands

```bash
yarn build        # Build all packages
yarn test         # Run all tests
yarn lint         # Lint all packages
yarn typecheck    # TypeScript type checking
yarn format       # Format with Prettier
```

## Running Tests

```bash
# All tests
yarn test

# Specific package
yarn workspace @internal/plugin-librechat-backend test

# With coverage
yarn test -- --coverage
```

## Project Structure

```
plugins/
  librechat-common/src/
    types.ts          # Shared TypeScript interfaces
    permissions.ts    # Backstage permission definitions
  librechat/src/
    api/              # API client and interface
    components/       # React components
      ChatBubble/     # Chat widget components
      AdminPanel/     # Admin configuration
      common/         # Shared components
    hooks/            # React hooks
    plugin.ts         # Plugin registration
    routes.ts         # Route references
  librechat-backend/src/
    database/         # Knex setup, migrations
    service/          # Business logic services
    router.ts         # Express routes
    plugin.ts         # Backend plugin registration
```

## Adding a Migration

Create a new file in `plugins/librechat-backend/src/database/migrations/` following the naming pattern `NNN_description.ts`.

## Tech Stack

- TypeScript 5.4 (strict mode)
- React 18 + Material UI v5
- Backstage core-plugin-api / backend-plugin-api
- Knex (PostgreSQL / SQLite)
- OpenAI SDK (LibreChat compatible)
- Jest 29 + React Testing Library
