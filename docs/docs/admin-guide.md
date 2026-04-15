# Admin Guide

## Accessing the Admin Panel

Navigate to the LibreChat admin page in your Backstage instance. You need the `librechat.admin.manage` permission.

## Agent Configuration

- **Agent**: Select the LibreChat agent to use for conversations
- **Greeting Message**: The initial message shown when a user opens the chat

## Appearance

- **Bubble Position**: Choose between `bottom-right` and `bottom-left`
- **Enabled**: Toggle the chat bubble on/off globally

## Access Control

- **Allowed Groups**: Comma-separated list of Backstage group entity refs
  - Example: `group:default/engineering, group:default/support`
  - Leave empty to allow all authenticated users

## Configuration Persistence

All admin settings are persisted in the `agent_config` database table (singleton row). Changes take effect immediately for all users.
