FROM node:22-bookworm-slim AS builder

WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@9.12.0 \
    && npm cache clean --force

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-ts/package.json ./apps/api-ts/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json

RUN pnpm --filter @fresh/api-ts... install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY apps/api-ts ./apps/api-ts

RUN pnpm --filter @freshphones/contracts build \
    && DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @fresh/api-ts db:generate \
    && pnpm --filter @fresh/api-ts build \
    && pnpm --filter @fresh/api-ts --prod deploy /runtime

FROM builder AS migrations

CMD ["pnpm", "--filter", "@fresh/api-ts", "db:migrate"]

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4100

WORKDIR /app

COPY apps/api-ts/scripts/gcash_pdf_requirements.txt /tmp/gcash_pdf_requirements.txt

ENV GCASH_PYTHON_BIN=/opt/gcash-pdf/bin/python

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl python3 python3-venv python3-pil poppler-utils tesseract-ocr tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/gcash-pdf \
    && /opt/gcash-pdf/bin/pip install --no-cache-dir -r /tmp/gcash_pdf_requirements.txt \
    && rm /tmp/gcash_pdf_requirements.txt \
    && mkdir -p /app/.local \
    && chown node:node /app/.local

COPY --from=builder --chown=node:node /runtime/package.json ./package.json
COPY --from=builder --chown=node:node /runtime/node_modules ./node_modules
COPY --from=builder --chown=node:node /runtime/dist ./dist
COPY --from=builder --chown=node:node /runtime/scripts ./scripts

USER node

EXPOSE 4100

CMD ["node", "dist/main.js"]
