'use strict';
// Lumera server: `node server/index.js` (or `npm start`).
// Serves the site from public/ and the API under /api. See BACKEND.md.
const http = require('node:http');
const config = require('./config');
const { createApp, VERSION } = require('./app');

const handler = createApp(config);
const server = http.createServer(handler);
server.headersTimeout = 15000;
server.requestTimeout = 30000;

server.listen(config.PORT, config.HOST, () => {
  console.log(`[lumera] v${VERSION} listening on http://${config.HOST}:${config.PORT} (${config.NODE_ENV})`);
  if (!config.ADMIN_EMAILS.length) console.log('[lumera] ADMIN_EMAILS is empty; nobody can open the admin portal yet.');
});

function shutdown() {
  server.close(() => { handler.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
