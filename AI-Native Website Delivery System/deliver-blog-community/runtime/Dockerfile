FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG BLOG_SITE_PROFILE=site.json
ARG PUBLIC_SITE_ORIGIN
ARG BLOG_PRODUCTION_PROJECT_ID
RUN BLOG_SITE_PROFILE=$BLOG_SITE_PROFILE PUBLIC_SITE_ORIGIN=$PUBLIC_SITE_ORIGIN BLOG_PRODUCTION_PROJECT_ID=$BLOG_PRODUCTION_PROJECT_ID node server/production-profile.mjs && pnpm build
RUN pnpm prune --prod

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/src/scripts ./src/scripts
COPY --from=build --chown=node:node /app/site-profile.mjs ./site-profile.mjs
COPY --from=build --chown=node:node /app/production-site.json ./production-site.json
USER node
EXPOSE 8080
CMD ["node", "server/start.mjs"]
