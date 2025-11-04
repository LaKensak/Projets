FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY prisma ./prisma
RUN npm install
RUN npx prisma generate

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json package.json
COPY prisma ./prisma
RUN npm prune --production
EXPOSE 4000
CMD ["node", "dist/index.js"]
