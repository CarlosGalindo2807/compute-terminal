// Load env from the repo-root .env so we don't have to duplicate secrets per app.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(resolve(__dirname, '../../.env'), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {
  // no .env at repo root — Vercel etc. provide env via the platform
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@compute-terminal/db', '@compute-terminal/shared'],
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
};
export default nextConfig;
