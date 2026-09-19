FROM node:24.14.0-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server.cjs apple-roots.json ./
USER node
EXPOSE 8080
CMD ["node", "server.cjs"]
