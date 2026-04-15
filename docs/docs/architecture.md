# Architecture Overview

## Package Structure

```
plugins/
  librechat-common/     # Shared types and permissions
  librechat/            # Frontend plugin (React components, hooks, API client)
  librechat-backend/    # Backend plugin (Express routes, services, database)
```

## Data Flow

```
User → ChatBubble → useChat hook → LibreChatClient → Backend Router
                                                        ↓
                                                   ConversationService → Knex → Database
                                                   LibreChatService → openai SDK → LibreChat API
                                                        ↓
                                                   SSE Stream → Frontend → StreamingText
```

## Database Schema

### conversations

- `id` (UUID PK) — conversation identifier
- `user_id` — Backstage user entity ref
- `agent_id` — LibreChat agent identifier
- `title` — optional conversation title
- `created_at`, `updated_at` — timestamps

### messages

- `id` (UUID PK) — message identifier
- `conversation_id` (FK → conversations) — CASCADE on delete
- `role` — 'user' or 'assistant'
- `content` — message text
- `status` — 'sending', 'delivered', or 'error'
- `created_at` — timestamp

### agent_config

- Singleton row (id=1)
- `agent_id`, `api_key_ref`, `greeting_message`, `bubble_position`, `enabled`, `allowed_groups`

## API Endpoints

| Method | Path                        | Description               |
| ------ | --------------------------- | ------------------------- |
| GET    | /health                     | Health check              |
| POST   | /conversations              | Create conversation       |
| GET    | /conversations              | List user's conversations |
| DELETE | /conversations/:id          | Delete conversation       |
| POST   | /conversations/:id/messages | Send message              |
| GET    | /conversations/:id/messages | List messages             |
| GET    | /conversations/:id/stream   | SSE stream                |
| GET    | /admin/config               | Get config                |
| PUT    | /admin/config               | Update config             |
| GET    | /admin/agents               | List agents               |
