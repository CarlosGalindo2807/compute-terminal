const r = await fetch('https://compute-terminal.vercel.app/');
console.log('status:', r.status, 'len:', (await r.clone().text()).length);
const html = await r.text();
// Find chunks containing diff card text
const tokensIdx = html.indexOf('Tokens, not hours');
console.log('--- Tokens, not hours ---');
console.log(html.slice(tokensIdx, tokensIdx + 1200));
const euIdx = html.indexOf('EU-compliant by default');
console.log('--- EU-compliant ---');
console.log(html.slice(euIdx, euIdx + 1200));
const realIdx = html.indexOf('Real prices, not list prices');
console.log('--- Real prices ---');
console.log(html.slice(realIdx, realIdx + 1200));
const covIdx = html.indexOf('providers');
console.log('--- coverage (first hit "providers") ---');
console.log(html.slice(covIdx - 100, covIdx + 600));
