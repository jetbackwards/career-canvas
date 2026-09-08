FROM node:22-alpine AS build
WORKDIR /app
COPY package.json vite.config.js ./
RUN npm install
COPY client ./client
COPY public ./public
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json server.mjs ./
COPY src ./src
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown -R node:node /app /data
USER node
ENV PORT=3000 DATA_FILE=/data/career-canvas.json
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.mjs"]
