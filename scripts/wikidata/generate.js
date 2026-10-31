// Far Out — builds questions from Wikidata (free, public-domain data) with no AI and no account.
// Run: node scripts/wikidata/generate.js [familyId ...]     (all families when none are given)
// Answers are ranked by how many Wikipedia languages cover them: the famous ones are Low Orbit,
// the obscure ones Far Out. Replies are cached in scripts/wikidata/.cache, so re-runs are quick.
// Output: data/wiki/w-<family>-<n>.js, loaded by the game after the menu appears.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { families, occupations, DEMONYM, nice } = require('./families');
const ROOT = path.join(__dirname, '../..'), CACHE = path.join(__dirname, '.cache'), OUT = path.join(ROOT, 'data/wiki');
global.window = global;
require(path.join(ROOT, 'js/text.js'));
require(path.join(ROOT, 'js/core.js'));
const FO = window.FarOut, { keyOf, norm } = FO.text;
for (const f of fs.readdirSync(path.join(ROOT, 'data')).filter((f) => f.endsWith('.js'))) require(path.join(ROOT, 'data', f));

const askKey = (s) => norm(s).replace(/^name (a|an|the|some)? ?/, '');
const taken = new Set(FO.qs.concat(FO.cats).map((l) => askKey(l.ask)));
const SKIP = /\b(porn\w*|erotic|nazi\w*|terror\w*|massacre|genocide|murder\w*|serial killer|hentai)\b/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1);

// ---------- Wikidata ----------
const UA = 'FarOutGame/1.0 (https://github.com/itayrachmanov-star/far-out; offline question generator)';
let lastCall = 0, live = 0;
async function sparql(q) {
  const file = path.join(CACHE, crypto.createHash('sha1').update(q).digest('hex') + '.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(Math.max(0, lastCall + 1100 - Date.now())); // one request at a time, politely
    lastCall = Date.now();
    live++;
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 80000);
      const r = await fetch('https://query.wikidata.org/sparql', { method: 'POST', signal: ctl.signal,
        headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'query=' + encodeURIComponent(q) });
      clearTimeout(timer);
      if (process.env.WD_LOG) console.log(`  query ${live}: HTTP ${r.status} in ${Date.now() - lastCall} ms`);
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

// Groups people know come first: famous directors, bands and authors (by their own Wikipedia reach),
// or for places, the countries with the most to name.
const groupQuery = (f) => `SELECT ?g ?gLabel ${f.glinks ? '?gl ' : ''}(COUNT(DISTINCT ?item) AS ?n) WHERE {
  ${f.pattern}
  ?item wikibase:sitelinks ?il . FILTER(?il >= ${f.links})
  ${f.glinks ? `?g wikibase:sitelinks ?gl . FILTER(?gl >= ${f.glinks})` : ''}
  ?g rdfs:label ?gLabel . FILTER(LANG(?gLabel) = "en")
} GROUP BY ?g ?gLabel ${f.glinks ? '?gl ' : ''}HAVING(COUNT(DISTINCT ?item) >= 15) ORDER BY DESC(${f.glinks ? '?gl' : '?n'}) LIMIT ${f.limit}`;

// The most-covered countries, for "Name a city in …" style families.
const countryQuery = (n) => `SELECT ?g ?gLabel ?l WHERE {
  ?g wdt:P31 wd:Q6256 ; wikibase:sitelinks ?l .
  ?g rdfs:label ?gLabel . FILTER(LANG(?gLabel) = "en")
} ORDER BY DESC(?l) LIMIT ${n}`;

const memberQuery = (pattern, links, ids) => `SELECT ?g ?item ?itemLabel ?links (GROUP_CONCAT(DISTINCT ?al; separator="|") AS ?aliases) WHERE {
  VALUES ?g { ${ids.map((i) => 'wd:' + i).join(' ')} }
  ${pattern}
  ?item wikibase:sitelinks ?links . FILTER(?links >= ${links})
  ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en")
  OPTIONAL { ?item skos:altLabel ?al . FILTER(LANG(?al) = "en") }
} GROUP BY ?g ?item ?itemLabel ?links`;

const occGroupQuery = (codes) => `SELECT ?g ?gLabel (SAMPLE(?dem) AS ?d) (COUNT(DISTINCT ?item) AS ?n) WHERE {
  VALUES ?o { ${codes.split(' ').map((c) => 'wd:' + c).join(' ')} }
  ?item wdt:P106 ?o ; wdt:P27 ?g .
  ?item wikibase:sitelinks ?il . FILTER(?il >= 15)
  ?g wdt:P31 wd:Q6256 .
  ?g rdfs:label ?gLabel . FILTER(LANG(?gLabel) = "en")
  OPTIONAL { ?g wdt:P1549 ?dem . FILTER(LANG(?dem) = "en") }
} GROUP BY ?g ?gLabel HAVING(COUNT(DISTINCT ?item) >= 15) ORDER BY DESC(?n) LIMIT 40`;

// ---------- turning rows into a question ----------
const clean = (s) => String(s || '').replace(/[;|`\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
const usable = (s) => s.length >= 2 && s.length <= 60 && /[a-z]/i.test(s) && !/^Q\d+$/.test(s) && !SKIP.test(s);
const surname = (name) => { const w = name.split(' ').filter((x) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(x)); return w.length > 1 ? w[w.length - 1] : ''; };
const subtitle = (name) => { const m = name.match(/(?:: | – | - )([^:–]+)$/); return m ? m[1].trim() : ''; };

function question(id, theme, ask, what, rows, people) {
  const byKey = new Map();
  for (const r of rows) {
    const name = clean(r.itemLabel), k = keyOf(name);
    if (!usable(name) || !k) continue;
    const links = +r.links || 0, al = clean(r.aliases).length ? String(r.aliases).split('|').map(clean) : [];
    const cur = byKey.get(k);
    if (!cur || cur.links < links) byKey.set(k, { name, k, links, al });
  }
  const items = [...byKey.values()].sort((a, b) => b.links - a.links).slice(0, 100);
  if (items.length < 15) return null;
  // Friendlier extra names, when only one answer in the list has them: "Messi", "A New Hope".
  const extra = (it) => (people ? surname(it.name) : subtitle(it.name));
  const uses = new Map();
  for (const it of items) { const e = extra(it); if (e) uses.set(keyOf(e), (uses.get(keyOf(e)) || 0) + 1); }
  const own = new Set(items.map((it) => it.k));
  for (const it of items) {
    const e = extra(it);
    const names = (e && e.length >= 4 && uses.get(keyOf(e)) === 1 ? [e] : []).concat(it.al.filter((a) => usable(a) && a.length <= 40));
    const seen = new Set([it.k]), keep = [];
    for (const a of names.sort((x, y) => (x === e ? -1 : y === e ? 1 : x.length - y.length))) {
      const k = keyOf(a);
      if (!k || seen.has(k) || own.has(k)) continue; // never steal another answer's own name
      seen.add(k); keep.push(a);
      if (keep.length >= 4) break;
    }
    it.al = keep;
  }
  // Rarity by fame rank within the list.
  items.forEach((it, i) => { const r = i / items.length; it.c = i === 0 || (r < 0.12 && i < 8) ? 5 : r < 0.3 ? 4 : r < 0.5 ? 3 : r < 0.75 ? 2 : 1; });
  let src = items.map((it) => [it.name, ...it.al].join('|') + ':' + it.c).join('; ');
  // Check it the way the game will play it, and drop answers the game couldn't match.
  FO.addQuestions([{ id: 'w-check-' + id, theme, ask, what, items: src }]);
  const p = FO.buildPrompt({ c: 'w-check-' + id, t: 'any' });
  const bad = new Set(p.cat.items.filter((it) => { const j = FO.judge(p, it.f); return !j.ok || j.item !== it; }).map((it) => it.name));
  if (bad.size) {
    const left = items.filter((it) => !bad.has(it.name));
    if (left.length < 15) return null;
    src = left.map((it) => [it.name, ...it.al].join('|') + ':' + it.c).join('; ');
  }
  return { id, theme, ask, what, items: src };
}

function claim(ask) {
  const k = askKey(ask);
  if (taken.has(k)) return false;
  taken.add(k);
  return true;
}

function write(fam, qs) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.startsWith(`w-${fam}-`)) fs.unlinkSync(path.join(OUT, f));
  for (let i = 0; i * 100 < qs.length; i++) {
    const part = qs.slice(i * 100, i * 100 + 100).map((q) => '  ' + JSON.stringify(q) + ',').join('\n');
    fs.writeFileSync(path.join(OUT, `w-${fam}-${i + 1}.js`), `// Generated from Wikidata (CC0) by scripts/wikidata/generate.js. Do not edit by hand.\nFarOut.addQuestions([\n${part}\n]);\n`);
  }
}

// ---------- families ----------
async function runFamily(f) {
  const groups = (await sparql(f.countries ? countryQuery(f.limit) : groupQuery(f)))
    .map((r) => ({ id: qid(r.g), label: nice(clean(r.gLabel)), fame: +(r.gl || r.l || r.n) || 0 })).filter((g) => g.label && usable(g.label));
  const size = f.people ? 4 : f.countries ? 3 : 10, out = [];
  for (let i = 0; i < groups.length; i += size) {
    const batch = groups.slice(i, i + size);
    let rows;
    try { rows = await sparql(memberQuery(f.pattern, f.links, batch.map((g) => g.id))); } catch (e) { console.log(`  skipped a batch of ${f.id}: ${e.message}`); continue; }
    for (const g of batch) {
      const ask = f.ask(g.label);
      if (!claim(ask)) continue;
      const q = question(`w-${f.id}-${g.id.toLowerCase()}`, f.theme, ask, f.what(g.label), rows.filter((r) => qid(r.g) === g.id), f.people);
      if (q) out.push(Object.assign(q, { fame: g.fame }));
    }
  }
  return out;
}

// PEOPLE_PART=0 / 1 splits the occupations between two runs in parallel (written as people0 / people1).
const PART = process.env.PEOPLE_PART;
async function runPeople() {
  const out = [];
  for (const [label, theme, codes] of occupations.filter((_, i) => PART == null || i % 2 === +PART)) {
    let groups;
    try { groups = await sparql(occGroupQuery(codes)); } catch (e) { console.log(`  skipped ${label}: ${e.message}`); continue; }
    groups = groups.map((r) => ({ id: qid(r.g), country: clean(r.gLabel), dem: DEMONYM[clean(r.gLabel)] || clean(r.d), fame: +r.n || 0 })).filter((g) => g.dem && usable(g.dem));
    const pattern = `VALUES ?o { ${codes.split(' ').map((c) => 'wd:' + c).join(' ')} } ?item wdt:P106 ?o ; wdt:P27 ?g .`;
    for (let i = 0; i < groups.length; i += 6) {
      const batch = groups.slice(i, i + 6);
      let rows;
      try { rows = await sparql(memberQuery(pattern, 15, batch.map((g) => g.id))); } catch (e) { console.log(`  skipped ${label} batch: ${e.message}`); continue; }
      for (const g of batch) {
        const who = `${g.dem} ${label}`, a = /^[aeiou]/i.test(who) ? 'an' : 'a';
        const ask = `Name ${a} ${who}`;
        if (!claim(ask)) continue;
        const q = question(`w-people-${label.replace(/ /g, '')}-${g.id.toLowerCase()}`, theme, ask, `${a} ${who}`, rows.filter((r) => qid(r.g) === g.id), true);
        if (q) out.push(Object.assign(q, { fame: g.fame }));
      }
    }
    console.log(`  people: ${label} done, ${out.length} questions so far`);
  }
  return out;
}

(async () => {
  const want = new Set(process.argv.slice(2));
  const pick = (id) => !want.size || want.has(id);
  let total = 0;
  for (const f of families) {
    if (!pick(f.id)) continue;
    const t = Date.now();
    try {
      const qs = await runFamily(f);
      write(f.id, qs);
      total += qs.length;
      console.log(`${f.id}: ${qs.length} questions (${Math.round((Date.now() - t) / 1000)}s, ${live} live queries so far)`);
    } catch (e) { console.log(`${f.id}: failed (${e.message})`); }
  }
  if (pick('people')) { const qs = await runPeople(); write('people' + (PART ?? ''), qs); total += qs.length; console.log(`people: ${qs.length} questions`); }
  console.log(`Done: ${total} questions written to data/wiki/.`);
})();
