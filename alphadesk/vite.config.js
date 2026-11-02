import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// In dev, the API runs inside the Vite server - one command, one port.
// The server code is loaded with Node's own importer (not Vite's SSR loader)
// so it behaves exactly like production. Restart `npm run dev` after editing lib/.
function apiPlugin() {
  let routes;
  return {
    name: 'alphadesk-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();
        try {
          routes ||= await import(pathToFileURL(path.resolve('lib/routes.js')).href);
          if (!(await routes.handleApi(req, res))) next();
        } catch (err) {
          console.error('[api]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose .env values (e.g. ANTHROPIC_API_KEY, DEMO_DATA) to the server-side API only.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
  return { plugins: [react(), apiPlugin()] };
});
