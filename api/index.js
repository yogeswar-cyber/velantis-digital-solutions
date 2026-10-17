import app from '../server/src/app.js';

export default function handler(req, res) {
  // Ensure req.url includes /api prefix so Express /api route handlers match cleanly on Vercel
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
