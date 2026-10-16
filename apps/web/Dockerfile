FROM node:22-bookworm-slim AS builder

WORKDIR /workspace

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install --global pnpm@9.12.0 \
    && npm cache clean --force

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json

RUN pnpm --filter @fresh/web... install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL

RUN pnpm --filter @freshphones/contracts build \
    && pnpm --filter @fresh/web build

FROM builder AS preview

ENV NODE_ENV=development

CMD ["pnpm", "--filter", "@fresh/web", "dev", "--hostname", "127.0.0.1"]

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /workspace/apps/web/public ./apps/web/public

USER node

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
