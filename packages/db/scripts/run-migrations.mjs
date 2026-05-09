#!/usr/bin/env node
// Idempotent migration runner. Reads packages/db/migrations/*.sql in order,
// tracks applied migrations in a `_migrations` table, and skips already-applied ones.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(JSON.stringify({ level: 'fatal', msg: 'SUPABASE_DB_URL not set' }));
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

async function main() {
  await sql`
    create table if not exists _migrations (
      name        text primary key,
      applied_at  timestamptz default now(),
      checksum    text
    )
  `;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await sql`select 1 from _migrations where name = ${file}`;
    if (applied.length > 0) {
      console.log(JSON.stringify({ level: 'info', msg: 'skip', file }));
      continue;
    }
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(JSON.stringify({ level: 'info', msg: 'apply', file }));
    await sql.unsafe(content);
    await sql`insert into _migrations (name, checksum) values (${file}, ${hash(content)})`;
    console.log(JSON.stringify({ level: 'info', msg: 'applied', file }));
  }

  await sql.end();
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return String(h);
}

main().catch((err) => {
  console.error(JSON.stringify({ level: 'fatal', msg: 'migration failed', error: String(err) }));
  process.exit(1);
});
