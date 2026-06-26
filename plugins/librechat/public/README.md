# Static assets

Files placed in this folder are served at the app root during local
development (e.g. `plugins/librechat/public/chat-icon.png` is served at
`http://localhost:3000/chat-icon.png`).

To use a custom chat bubble icon, drop your image here and set the served
path in `app-config.yaml`:

```yaml
librechat:
  iconPath: /chat-icon.png
```

In a real Backstage app, place the image in `packages/app/public` instead.
