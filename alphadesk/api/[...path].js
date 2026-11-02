// Vercel serverless entry: every /api/* request is handled by the shared router.
import { handleApi } from '../lib/routes.js';

export default async function handler(req, res) {
  await handleApi(req, res);
}
