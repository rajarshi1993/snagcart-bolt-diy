/**
 * Minimal production server for bolt-diy on Railway.
 * Serves the Remix client build as a SPA (client-side rendering only).
 * ESM because package.json has "type": "module".
 */
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;
const CLIENT_DIR = path.join(__dirname, 'build', 'client');

// Serve static files with caching
app.use('/assets', express.static(path.join(CLIENT_DIR, 'assets'), {
  immutable: true,
  maxAge: '1y',
}));
app.use(express.static(CLIENT_DIR, { maxAge: '1h' }));

// SPA fallback — serve index.html for all non-file routes
app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`★ Snagcart Bolt production server on http://0.0.0.0:${PORT}`);
});
