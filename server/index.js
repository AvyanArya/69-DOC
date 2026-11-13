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
server.keepAliveTimeout = 65000;   // longer than a typical load balancer's idle timeout

server.listen(config.PORT, config.HOST, () => {
  console.log(`[lumera] v${VERSION} ${config.APP_ENV} listening on http://${config.HOST}:${config.PORT} (NODE_ENV=${config.NODE_ENV})`);
  const warn = (m) => console.warn('[lumera] ' + m);
  if (!config.ADMIN_EMAILS.length) warn('ADMIN_EMAILS is empty; nobody can open the admin portal yet.');
  if (!(config.RESEND_API_KEY && config.MAIL_FROM && config.PUBLIC_URL)) warn('Email is not configured (RESEND_API_KEY, MAIL_FROM, PUBLIC_URL); password reset emails are off.');
  if (config.isProd && !config.COOKIE_SECURE) warn('COOKIE_SECURE is off in production; sign-in cookies would travel over plain HTTP.');
  if (config.APP_ENV === 'staging' && !config.SITE_PASSWORD) warn('Staging without SITE_PASSWORD: anyone with the link can open it.');
});

// Log anything that escapes a handler instead of dying silently.
process.on('unhandledRejection', (err) => console.error('[lumera] unhandled rejection', err));
process.on('uncaughtException', (err) => { console.error('[lumera] uncaught exception', err); shutdown(1); });

function shutdown(code = 0) {
  server.close(() => { handler.close(); process.exit(code); });
  setTimeout(() => process.exit(code), 5000).unref();
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
