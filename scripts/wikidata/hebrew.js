// Far Out — Hebrew names for answers, from Wikidata (free, CC0), so players can answer in Hebrew too.
// Run: node scripts/wikidata/hebrew.js items     Hebrew names of every answer the Wikidata bank uses
//                                                (.cache/he-items.json, which generate.js adds as extra names)
//      node scripts/wikidata/hebrew.js curated   Hebrew names for the hand-written lists, found by English name
//                                                (writes data/he/he-<n>.js, loaded after the menu like the big bank)
// HE_PART=1/4 … 4/4 fetch a quarter of the curated look-ups each, in parallel; a final run without it then
// reads them all from the cache and writes the files.
const fs = require('fs'), path = require('path');
const { sparql, qid, CACHE } = require('./wd');
const ROOT = path.join(__dirname, '../..'), ITEMS = path.join(CACHE, 'he-items.json'), OUT = path.join(ROOT, 'data/he');

// "כספית (יסוד)" → "כספית"; only names with Hebrew letters and of a sensible length.
const heName = (s) => {
  const t = String(s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[;|:`\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return /[א-ת]/.test(t) && t.length <= 40 ? t : '';
};
const uniq = (arr) => [...new Set(arr.filter(Boolean))];
// Wikidata names animal families and dishes formally: "קרנפיים", "סוס הבית", "מנת ספגטי". Players type the plain word.
const plain = (he) => he.replace(/^(דמויי|מנת|מאכלי|משפחת) /, '').replace(/ (הבית|המצוי|המצויה)$/, '');
const heVariants = (he) => {
  const p = plain(he);
  return uniq([he, p, /^[^ ]{4,}יים$/.test(p) ? p.slice(0, -3) : '', /^[^ ]{4,}ים$/.test(p) ? p.slice(0, -2) : '']);
};

const labelQuery = (ids) => `SELECT ?item ?he (GROUP_CONCAT(DISTINCT ?al; separator="|") AS ?als) WHERE {
  VALUES ?item { ${ids.map((i) => 'wd:' + i).join(' ')} }
  ?item rdfs:label ?he . FILTER(LANG(?he) = "he")
  OPTIONAL { ?item skos:altLabel ?al . FILTER(LANG(?al) = "he") }
} GROUP BY ?item ?he`;

// Every answer the generator has seen, from its cached replies.
async function items() {
  const ids = new Set();
  for (const f of fs.readdirSync(CACHE)) {
    if (!/^[0-9a-f]{40}\.json$/.test(f)) continue;
    let rows;
    try { rows = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')); } catch (e) { continue; }
    if (Array.isArray(rows)) for (const r of rows) if (r.item && r.itemLabel) ids.add(qid(r.item));
  }
  const all = [...ids].sort(), out = {};
  console.log(`${all.length} answers to look up`);
  for (let i = 0; i < all.length; i += 600) {
    let rows;
    try { rows = await sparql(labelQuery(all.slice(i, i + 600))); } catch (e) { console.log(`  skipped a batch: ${e.message}`); continue; }
    for (const r of rows) {
      const names = uniq([heName(r.he), ...String(r.als || '').split('|').map(heName).filter((a) => a.length <= 30)]).slice(0, 3);
      if (names.length) out[qid(r.item)] = names;
    }
    if (i % 30000 === 0) console.log(`  ${i + 600} looked up, ${Object.keys(out).length} have Hebrew names`);
  }
  fs.writeFileSync(ITEMS, JSON.stringify(out));
  console.log(`Done: ${Object.keys(out).length} Hebrew names in ${path.relative(ROOT, ITEMS)}`);
}

// Things whose English name matches exactly, with their Hebrew name, fame and kinds (instance of / subclass of).
const nameQuery = (names) => `SELECT ?n ?item ?sl ?he (GROUP_CONCAT(DISTINCT ?t; separator=" ") AS ?ts) WHERE {
  VALUES ?n { ${names.map((n) => JSON.stringify(n) + '@en').join(' ')} }
  ?item rdfs:label ?n ; wikibase:sitelinks ?sl .
  ?item rdfs:label ?he . FILTER(LANG(?he) = "he")
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q4167410 }
  OPTIONAL { ?item wdt:P31|wdt:P279 ?t }
} GROUP BY ?n ?item ?sl ?he`;

async function curated() {
  global.window = global;
  require(path.join(ROOT, 'js/text.js'));
  require(path.join(ROOT, 'js/core.js'));
  const FO = window.FarOut, { keyOf } = FO.text;
  for (const f of fs.readdirSync(path.join(ROOT, 'data')).filter((f) => f.endsWith('.js')).sort()) require(path.join(ROOT, 'data', f));
  const lists = FO.qs.filter((l) => !l.deep).concat(FO.cats);
  // Wikidata writes "golden retriever", "Mount Everest", "Pride and Prejudice": try each answer three ways.
  const spell = (name) => uniq([name, name.toLowerCase(), name[0] + name.slice(1).toLowerCase()]).filter((s) => s.length <= 60);
  const names = new Set();
  for (const l of lists) for (const it of l.items) spell(it.name).forEach((s) => names.add(s));
  const all = [...names].sort(), found = new Map(); // spelling -> [{id, sl, he, types}]
  console.log(`${lists.length} lists, ${all.length} spellings to look up`);
  const [part, parts] = (process.env.HE_PART || '1/1').split('/').map(Number);
  for (let i = 0; i < all.length; i += 250) {
    if ((i / 250) % parts !== part - 1) continue;
    let rows;
    try { rows = await sparql(nameQuery(all.slice(i, i + 250))); } catch (e) { console.log(`  skipped a batch: ${e.message}`); continue; }
    for (const r of rows) {
      const he = heName(r.he);
      if (!he) continue;
      if (!found.has(r.n)) found.set(r.n, []);
      found.get(r.n).push({ id: qid(r.item), sl: +r.sl || 0, he, types: new Set(String(r.ts || '').split(' ').filter(Boolean).map(qid)) });
    }
    if (i % 25000 === 0) console.log(`  ${i + 250} looked up, ${found.size} found`);
  }

  if (parts > 1) { console.log(`Part ${part} of ${parts} fetched.`); return; }
  // A name can mean several things ("mercury"): pick the meaning that is the same kind as the rest of the list.
  const out = {};
  let named = 0;
  for (const l of lists) {
    const entries = [];
    for (const it of l.items) {
      const seen = new Set(), cs = [];
      for (const s of spell(it.name)) for (const c of found.get(s) || []) if (!seen.has(c.id)) { seen.add(c.id); cs.push(c); }
      if (cs.length) entries.push({ it, cs: cs.sort((a, b) => b.sl - a.sl) });
    }
    const kinds = new Map();
    for (const e of entries) new Set(e.cs.flatMap((c) => [...c.types])).forEach((t) => kinds.set(t, (kinds.get(t) || 0) + 1));
    const need = Math.max(3, entries.length * 0.3), main = new Set([...kinds].filter(([, n]) => n >= need).map(([t]) => t));
    const picks = [];
    for (const e of entries) {
      const fit = e.cs.find((c) => [...c.types].some((t) => main.has(t)));
      const c = fit || (!main.size && e.cs[0].sl >= 3 ? e.cs[0] : null); // a mixed list takes the best-known meaning
      if (c) picks.push([e.it, c.he]);
    }
    // Two answers with one Hebrew name (crow and raven are both עורב): neither gets it.
    const uses = new Map();
    for (const [, he] of picks) uses.set(keyOf(he), (uses.get(keyOf(he)) || 0) + 1);
    const lines = picks.filter(([, he]) => uses.get(keyOf(he)) === 1).map(([it, he]) => [it.name, ...heVariants(he)].join('|'));
    if (lines.length) { out[l.id] = lines.join('; '); named += lines.length; }
  }
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (/^he-\d+\.js$/.test(f)) fs.unlinkSync(path.join(OUT, f));
  const ids = Object.keys(out);
  for (let i = 0; i * 250 < ids.length; i++) {
    const part = ids.slice(i * 250, i * 250 + 250).map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(out[id])},`).join('\n');
    fs.writeFileSync(path.join(OUT, `he-${i + 1}.js`), `// Hebrew names for the hand-written lists, from Wikidata (CC0) by scripts/wikidata/hebrew.js. Do not edit by hand.\nFarOut.extend({\n${part}\n});\n`);
  }
  console.log(`Done: Hebrew names for ${named} answers in ${ids.length} lists, written to data/he/`);
}

module.exports = { heVariants, ITEMS };
if (require.main !== module) return;
const mode = process.argv[2];
(mode === 'items' ? items() : mode === 'curated' ? curated() : Promise.reject(new Error('usage: hebrew.js items | curated')))
  .catch((e) => { console.error(e.message); process.exit(1); });
