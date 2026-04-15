FROM node:18-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare yarn@4.1.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY plugins/ plugins/
RUN yarn install --immutable
RUN yarn build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare yarn@4.1.0 --activate

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/plugins/librechat-common/dist ./plugins/librechat-common/dist
COPY --from=builder /app/plugins/librechat-common/package.json ./plugins/librechat-common/
COPY --from=builder /app/plugins/librechat/dist ./plugins/librechat/dist
COPY --from=builder /app/plugins/librechat/package.json ./plugins/librechat/
COPY --from=builder /app/plugins/librechat-backend/dist ./plugins/librechat-backend/dist
COPY --from=builder /app/plugins/librechat-backend/package.json ./plugins/librechat-backend/

EXPOSE 7007
CMD ["node", "plugins/librechat-backend/dist/standalone.js"]
