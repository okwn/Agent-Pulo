FROM node:20-alpine AS base

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json packages/
COPY apps/*/package.json apps/
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web .
RUN pnpm build --filter @pulo/web

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

COPY --from=builder /app/apps/web/.next .next
COPY --from=builder /app/apps/web/public ./public
COPY --from=deps /app/node_modules ./node_modules

CMD ["pnpm", "start"]