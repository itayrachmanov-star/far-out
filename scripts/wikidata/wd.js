// Wikidata queries shared by the generator scripts: one polite request at a time, every reply cached
// in scripts/wikidata/.cache. WD_OFFLINE=1 answers from the cache only (a re-run then needs no network).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const CACHE = path.join(__dirname, '.cache');
const UA = 'FarOutGame/1.0 (https://github.com/itayrachmanov-star/far-out; offline question generator)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1);
const clean = (s) => String(s || '').replace(/[;|`\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();

let lastCall = 0;
const stats = { live: 0 };
async function sparql(q) {
  const file = path.join(CACHE, crypto.createHash('sha1').update(q).digest('hex') + '.json');
  if (fs.existsSync(file)) try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* cut off mid-write: ask again */ }
  if (process.env.WD_OFFLINE) throw new Error('not in the cache (offline run)');
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(Math.max(0, lastCall + 1100 - Date.now()));
    lastCall = Date.now();
    stats.live++;
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 80000);
      const r = await fetch('https://query.wikidata.org/sparql', { method: 'POST', signal: ctl.signal,
        headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'query=' + encodeURIComponent(q) });
      clearTimeout(timer);
      if (process.env.WD_LOG) console.log(`  query ${stats.live}: HTTP ${r.status} in ${Date.now() - lastCall} ms`);
      if (r.status === 429 || r.status >= 500) { await sleep(Math.max((+r.headers.get('retry-after') || 0) * 1000, 6000 * 3 ** attempt)); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = (await r.json()).results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
      fs.mkdirSync(CACHE, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(rows));
      return rows;
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(6000 * 3 ** attempt);
    }
  }
  throw new Error('Wikidata kept refusing this query');
}

module.exports = { sparql, stats, qid, clean, sleep, CACHE };
