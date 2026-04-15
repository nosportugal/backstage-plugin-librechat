# Configuration Reference

## `app-config.yaml` Options

| Key                                      | Type   | Required | Default          | Description                                |
| ---------------------------------------- | ------ | -------- | ---------------- | ------------------------------------------ |
| `librechat.baseUrl`                      | string | Yes      | —                | LibreChat server URL                       |
| `librechat.apiKey`                       | string | Yes      | —                | API key for LibreChat                      |
| `librechat.agentId`                      | string | Yes      | —                | Default agent ID                           |
| `librechat.database.client`              | string | No       | `better-sqlite3` | Database client (`pg` or `better-sqlite3`) |
| `librechat.database.connection.host`     | string | No       | —                | PostgreSQL host                            |
| `librechat.database.connection.port`     | number | No       | 5432             | PostgreSQL port                            |
| `librechat.database.connection.user`     | string | No       | —                | PostgreSQL user                            |
| `librechat.database.connection.password` | string | No       | —                | PostgreSQL password                        |
| `librechat.database.connection.database` | string | No       | —                | PostgreSQL database name                   |

## Environment Variables

| Variable            | Description                               |
| ------------------- | ----------------------------------------- |
| `LIBRECHAT_API_KEY` | API key for authenticating with LibreChat |
| `POSTGRES_PASSWORD` | PostgreSQL password (if using pg)         |

## Database

The plugin supports two database backends:

### SQLite (Development)

```yaml
librechat:
  database:
    client: better-sqlite3
```

Uses in-memory SQLite by default. Data is lost on restart.

### PostgreSQL (Production)

```yaml
librechat:
  database:
    client: pg
    connection:
      host: localhost
      port: 5432
      user: backstage
      password: ${POSTGRES_PASSWORD}
      database: backstage_librechat
```

## Permissions

| Permission               | Action | Description                             |
| ------------------------ | ------ | --------------------------------------- |
| `librechat.chat.use`     | read   | Access to use the chat bubble           |
| `librechat.admin.manage` | update | Access to the admin configuration panel |
