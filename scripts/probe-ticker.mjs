// Probe the live ticker: for each tk-item, surface label, value, sparkline
// point count, and delta. Tolerates the React Flight protocol's quoting.

const html = await (await fetch('https://compute-terminal.vercel.app/')).text();
const i = html.indexOf('ticker-track');
const chunk = html.slice(i, i + 22000);
const blocks = chunk.split('"a-').slice(1, 14);

function findFirst(s, regex) {
  const m = s.match(regex);
  return m ? m[1] : null;
}

for (const b of blocks) {
  const label = findFirst(b, /tk-label[^"]*"children\\":\\"([^"\\]+)/);
  const val = findFirst(b, /tk-val[^"]*"children\\":\\"([^"\\]+)/);
  const pathD = findFirst(b, /"d\\":\\"([^"\\]+)\\"/);
  const dir = findFirst(b, /tk-d (down|up)/);
  const pct = findFirst(b, /(?:▲|▼)\\",\\" \\",\\"([\d.]+)/);
  const pts = pathD ? (pathD.match(/L/g) || []).length + 1 : 0;
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '?';
  // Sparkline flatness check
  const allSameY = pathD ? /^M[\d.]+,([\d.]+)( L[\d.]+,\1)+$/.test(pathD) : false;
  const flat = allSameY ? ' · flat' : '';
  console.log(
    `  ${(label ?? '—').padEnd(20)} ${(val?.replace('$$', '$') ?? '—').padEnd(10)}  ${arrow} ${(pct ?? '—').padStart(6)}%   spark-pts=${pts}${flat}`,
  );
}
