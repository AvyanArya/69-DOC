# Lumera: the Node server plus the built site in public/.
# The server has no runtime dependencies (node:http, node:sqlite, node:crypto),
# so the image is Node and two folders. Build the site first (npm run build);
# public/ is committed and `npm run check` proves it matches the source.
#
#   docker build -t lumera .
#   docker run -p 8080:8080 -v lumera-data:/data --env-file .env lumera
FROM node:22-alpine

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATA_DIR=/data

WORKDIR /app
COPY package.json ./
COPY server ./server
COPY scripts ./scripts
COPY public ./public

# The database lives on a mounted volume, owned by the unprivileged user.
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
