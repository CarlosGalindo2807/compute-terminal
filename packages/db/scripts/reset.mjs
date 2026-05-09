#!/usr/bin/env node
// Drops the public schema and re-applies all migrations + seeds. DESTRUCTIVE.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.CONFIRM_DB_RESET) {
  console.error('Refusing to run without CONFIRM_DB_RESET=yes. This drops all data.');
  process.exit(1);
}

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

await sql.unsafe(`
  drop schema if exists public cascade;
  create schema public;
  grant all on schema public to postgres;
  grant all on schema public to public;
`);
await sql.end();

const node = process.execPath;
const migrate = spawnSync(node, [join(__dirname, 'run-migrations.mjs')], { stdio: 'inherit' });
if (migrate.status !== 0) process.exit(migrate.status ?? 1);
const seed = spawnSync(node, [join(__dirname, 'run-seeds.mjs')], { stdio: 'inherit' });
process.exit(seed.status ?? 0);
