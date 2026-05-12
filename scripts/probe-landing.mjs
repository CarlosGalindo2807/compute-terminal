const html = await (await fetch('https://compute-terminal.vercel.app/')).text();
console.log('len:', html.length);

const heroIdx = html.indexOf('Live across');
console.log('--- hero sub ---');
console.log(html.slice(heroIdx, heroIdx + 250));

const upIdx = html.indexOf('uptime');
console.log('\n--- coverage area ---');
console.log(html.slice(upIdx - 400, upIdx + 600));

const snapsIdx = html.indexOf('snapshots since launch');
console.log('\n--- 2nd snapshots hit (coverage strip) ---');
const second = html.indexOf('snapshots', snapsIdx + 20);
console.log(html.slice(second - 200, second + 500));
