FROM node:20-alpine AS base

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json packages/
COPY apps/*/package.json apps/
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build --filter @pulo/api

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages ./packages
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 4311

ENV PORT=4311
ENV HOST=0.0.0.0

CMD ["node", "dist/server.js"]