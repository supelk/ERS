FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@9.15.9 --activate
COPY server/package.json server/tsconfig.json ./
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
WORKDIR /app
COPY server/src ./src
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
RUN corepack prepare pnpm@9.15.9 --activate
COPY server/package.json ./
RUN pnpm install --prod --frozen-lockfile=false
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
