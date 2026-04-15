# Backstage LibreChat Plugin

A Backstage plugin that integrates LibreChat AI agent functionality via a floating chat bubble widget.

## Features

- **Chat Bubble**: Floating FAB button with embedded chat window
- **Conversations**: Create, continue, and delete conversation threads
- **Streaming Responses**: Real-time token-by-token AI response rendering via SSE
- **Admin Panel**: Configure agent, greeting message, bubble position, and access controls
- **Backstage Permissions**: Fine-grained access via `librechat.chat.use` and `librechat.admin.manage`
- **Database Persistence**: Conversations and messages persisted via Knex (PostgreSQL or SQLite)

## Quick Links

- [Getting Started](getting-started.md)
- [Configuration Reference](configuration.md)
- [Admin Guide](admin-guide.md)
- [Architecture Overview](architecture.md)
- [Development Guide](development.md)
