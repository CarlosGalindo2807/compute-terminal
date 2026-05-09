import postgres from 'postgres';
const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require', max: 1 });

const [snaps] = await sql`select count(*)::int as total,
  count(*) filter (where is_normalized) as normalized,
  count(*) filter (where not is_normalized) as unmatched
  from price_snapshots`;
const [unmatched] = await sql`select count(*)::int as pending from unmatched_listings where status = 'pending'`;
const top = await sql`select g.slug, count(*)::int as snapshots, round(avg(p.price_per_hour)::numeric, 4) as avg_price
  from price_snapshots p join gpu_models g on g.id = p.gpu_model_id
  where p.is_normalized
  group by g.slug
  order by count(*) desc`;

console.log('Snapshots:', snaps);
console.log('Unmatched still pending:', unmatched.pending);
console.log('\nBy GPU:');
for (const r of top) console.log(`  ${r.slug.padEnd(34)} n=${String(r.snapshots).padStart(3)}  $${r.avg_price}/h`);

await sql.end();
