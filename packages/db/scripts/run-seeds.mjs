#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = join(__dirname, '..', 'seeds');

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(JSON.stringify({ level: 'fatal', msg: 'SUPABASE_DB_URL not set' }));
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

async function main() {
  const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    console.log(JSON.stringify({ level: 'info', msg: 'seed', file }));
    const content = readFileSync(join(SEEDS_DIR, file), 'utf8');
    await sql.unsafe(content);
  }
  await sql.end();
}

main().catch((err) => {
  console.error(JSON.stringify({ level: 'fatal', msg: 'seed failed', error: String(err) }));
  process.exit(1);
});
