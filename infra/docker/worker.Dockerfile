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
RUN pnpm build --filter @pulo/worker

FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/packages ./packages
COPY --from=deps /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]