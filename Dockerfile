FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY public ./public
RUN mkdir -p /data && chown -R node:node /app /data
USER node
ENV PORT=3000 DATA_FILE=/data/career-canvas.json
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.mjs"]
