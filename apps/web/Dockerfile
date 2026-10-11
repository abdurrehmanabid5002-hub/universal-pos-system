FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm ci
RUN npm run build --workspace=@universal-pos/shared
RUN npm run build --workspace=@universal-pos/contracts
RUN npm run build --workspace=@universal-pos/web

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
