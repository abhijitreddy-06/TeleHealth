const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
require('dotenv').config();

const REQUIRED_VARS = ['DATABASE_URL', 'REFRESH_TOKEN_SECRET'];
const PROJECT_ROOT = process.cwd();

function checkNodeModules() {
  const nodeModulesPath = path.join(PROJECT_ROOT, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    return {
      ok: false,
      message: 'Missing node_modules. Run "npm install" in project root before starting backend.',
    };
  }
  return { ok: true };
}

function checkEnv() {
  const missing = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) missing.push(key);
  }

  const hasAccessSecret = Boolean(process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);
  if (!hasAccessSecret) {
    missing.push('ACCESS_TOKEN_SECRET (or JWT_SECRET)');
  }

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Missing required env vars for local backend: ${missing.join(', ')}`,
    };
  }

  if (process.env.ACCESS_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET && process.env.ACCESS_TOKEN_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    console.warn('[preflight:backend] Warning: ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET are identical. Use different values for security.');
  }

  return { ok: true };
}

function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function main() {
  const port = Number(process.env.PORT || 10000);
  const checks = [checkNodeModules(), checkEnv()];

  for (const check of checks) {
    if (!check.ok) {
      console.error(`[preflight:backend] ${check.message}`);
      process.exit(1);
    }
  }

  const portAvailable = await checkPortAvailable(port);
  if (!portAvailable) {
    console.error(`[preflight:backend] Port ${port} is already in use. Free the port, then retry.`);
    console.error('[preflight:backend] Tip: run "npm run local:free-ports" from project root.');
    process.exit(1);
  }

  console.log(`[preflight:backend] OK. Backend can start on port ${port}.`);
}

main().catch((error) => {
  console.error('[preflight:backend] Unexpected error:', error.message);
  process.exit(1);
});
