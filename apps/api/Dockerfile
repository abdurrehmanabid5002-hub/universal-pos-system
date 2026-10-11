FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm ci
RUN npm run build --workspace=@universal-pos/shared
RUN npm run build --workspace=@universal-pos/contracts
RUN npm run build --workspace=@universal-pos/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
