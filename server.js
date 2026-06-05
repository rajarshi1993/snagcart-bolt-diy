/**
 * Production Express server for bolt-diy on Railway.
 * Uses @remix-run/express to serve the Remix app.
 * Bridges process.env into context.cloudflare.env so API keys work via Railway env vars.
 *
 * NOTE: This file uses ESM because package.json has "type": "module".
 */
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';

// Install Node.js globals (fetch, FormData, etc.) needed by Remix
installGlobals();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;
const CLIENT_BUILD_PATH = path.join(__dirname, 'build/client');

// Serve static assets from the client build with long-term caching
app.use(
  '/assets',
  express.static(path.join(CLIENT_BUILD_PATH, 'assets'), {
    immutable: true,
    maxAge: '1y',
  })
);
app.use(express.static(CLIENT_BUILD_PATH, { maxAge: '1h' }));

// Build the cloudflare-like env object from process.env
// This bridges Railway environment variables into context.cloudflare.env
function buildCloudflareEnv() {
  return {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    HuggingFace_API_KEY: process.env.HuggingFace_API_KEY || '',
    OPEN_ROUTER_API_KEY: process.env.OPEN_ROUTER_API_KEY || '',
    OLLAMA_API_BASE_URL: process.env.OLLAMA_API_BASE_URL || '',
    OPENAI_LIKE_API_KEY: process.env.OPENAI_LIKE_API_KEY || '',
    OPENAI_LIKE_API_BASE_URL: process.env.OPENAI_LIKE_API_BASE_URL || '',
    OPENAI_LIKE_API_MODELS: process.env.OPENAI_LIKE_API_MODELS || '',
    TOGETHER_API_KEY: process.env.TOGETHER_API_KEY || '',
    TOGETHER_API_BASE_URL: process.env.TOGETHER_API_BASE_URL || '',
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
    LMSTUDIO_API_BASE_URL: process.env.LMSTUDIO_API_BASE_URL || '',
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',
    XAI_API_KEY: process.env.XAI_API_KEY || '',
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
    AWS_BEDROCK_CONFIG: process.env.AWS_BEDROCK_CONFIG || '',
    RUNNING_IN_DOCKER: process.env.RUNNING_IN_DOCKER || 'true',
    DEFAULT_NUM_CTX: process.env.DEFAULT_NUM_CTX || '',
  };
}

// Dynamically import the server build (ESM)
const build = await import('./build/server/index.js');

// Handle all requests through Remix
app.all(
  '*',
  createRequestHandler({
    build,
    mode: process.env.NODE_ENV || 'production',
    getLoadContext(_req, _res) {
      return {
        cloudflare: {
          env: buildCloudflareEnv(),
          cf: {},
          ctx: {
            waitUntil: (_promise) => {},
            passThroughOnException: () => {},
          },
          caches: {
            default: {
              put: async () => {},
              match: async () => undefined,
              delete: async () => false,
            },
          },
        },
      };
    },
  })
);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n★═══════════════════════════════════════★`);
  console.log(`  Snagcart Bolt - Production Server`);
  console.log(`  Listening on http://0.0.0.0:${PORT}`);
  console.log(`★═══════════════════════════════════════★\n`);
});
