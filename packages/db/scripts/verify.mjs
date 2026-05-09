// Quick post-seed sanity check.
import postgres from 'postgres';

const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require', max: 1 });

const counts = {};
for (const t of ['providers', 'gpu_models', 'compute_indices', 'normalization_rules']) {
  const [{ count }] = await sql`select count(*)::int as count from ${sql(t)}`;
  counts[t] = count;
}
console.log(JSON.stringify(counts, null, 2));
await sql.end();
