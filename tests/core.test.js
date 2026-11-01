// Node test of js/core.js against the real data files. Run: node tests/core.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
global.window = global;
require(path.join(__dirname, '../js/text.js'));
require(path.join(__dirname, '../js/core.js'));
for (const f of fs.readdirSync(path.join(__dirname, '../data')).filter((f) => f.endsWith('.js')).sort()) require(path.join(__dirname, '../data', f));
const WIKI = path.join(__dirname, '../data/wiki'); // the generated Wikidata bank (scripts/wikidata/generate.js)
if (fs.existsSync(WIKI)) for (const f of fs.readdirSync(WIKI).filter((f) => f.endsWith('.js')).sort()) require(path.join(WIKI, f));
const HE = path.join(__dirname, '../data/he'); // Hebrew names for the hand-written lists (scripts/wikidata/hebrew.js)
if (fs.existsSync(HE)) for (const f of fs.readdirSync(HE).filter((f) => f.endsWith('.js')).sort()) require(path.join(HE, f));
const FO = window.FarOut;
console.log(`${FO.qs.length} questions, ${FO.cats.length} categories, ${FO.cats.reduce((n, c) => n + c.items.length, 0)} answers, ${FO.countPrompts()} prompts`);

const any = (id) => FO.buildPrompt({ c: id, t: 'any' });
const has = (id) => !!FO.catById[id];
let checks = 0;
function expect(id, spec, text, ok, why) {
  if (!has(id)) return;
  const p = FO.buildPrompt(Object.assign({ c: id, t: 'any' }, spec));
  const j = FO.judge(p, text);
  assert.strictEqual(j.ok, ok, `${id} ${JSON.stringify(spec)} "${text}" → ${JSON.stringify(j.why || j.tier.name)}`);
  if (why) assert.strictEqual(j.why, why);
  checks++;
}
expect('fruit', {}, 'Apple', true);
expect('fruit', {}, 'apples', true);
expect('fruit', {}, 'strawberries', true);
expect('fruit', {}, 'Rambutan', true);
expect('fruit', {}, 'rambuttan', true);          // typo
expect('fruit', {}, 'xyzzy', false, 'unknown');
expect('fruit', { t: 'start', v: 'p' }, 'pear', true);
expect('fruit', { t: 'start', v: 'p' }, 'apple', false, 'rule');
expect('country', {}, 'USA', true);
expect('country', {}, 'the netherlands', true);
expect('country', {}, 'Côte d’Ivoire', true);
// letter-count rules are gone: an old host asking for one gets a plain prompt
expect('country', { t: 'len', v: 5 }, 'france', true);
assert.strictEqual(FO.buildPrompt({ c: 'country', t: 'end', v: 'a' }).rule, '');
expect('bird', {}, 'hummingbirds', true);
expect('element', {}, 'oxygen', true);
expect('river', {}, 'Nile River', true);
expect('river', {}, 'the river thames', true);
expect('mountain', {}, 'Mount Everest', true);
expect('cat-breed', {}, 'persian cat', true);
expect('proglang', {}, 'C++', true);
// typo fixing
function fix(id, text, want) {
  if (!has(id)) return;
  const j = FO.judge(FO.buildPrompt({ c: id, t: 'any' }), text);
  const got = j.ok ? j.item.name : j.why === 'maybe' ? 'maybe:' + j.options.map((o) => o.name).join('/') : j.why;
  assert.strictEqual(got, want, `${id} "${text}" → ${got}`);
  checks++;
}
fix('vegetable', 'brocoli', 'Broccoli');
fix('vegetable', 'brocolli', 'Broccoli');
fix('vegetable', 'zuchini', 'Zucchini');
fix('country', 'phillipines', 'Philippines');
fix('country', 'columbia', 'Colombia');
fix('fruit', 'aple', 'Apple');
fix('fruit', 'bannana', 'Banana');
fix('fruit', 'pinapple', 'Pineapple');
fix('mammal', 'girafe', 'Giraffe');
fix('mammal', 'hippopotamous', 'Hippopotamus');
fix('us-state', 'massachusets', 'Massachusetts');
fix('us-state', 'missisipi', 'Mississippi');
fix('country', 'austrailia', 'Australia');
fix('capital', 'budapesht', 'Budapest');
// a real answer from another list is never "corrected" into this one
FO.addQuestions([{ id: 'q-test-europe', theme: 'Geography', ask: 'Name a European country', what: 'a European country', items: 'austria:4; france:5; germany:5; spain:5; italy:5; portugal:4; poland:4; greece:4; norway:4; sweden:4; finland:3; denmark:4; ireland:4; belgium:3; netherlands:4; switzerland:4' }]);
fix('q-test-europe', 'australia', 'unknown');
fix('q-test-europe', 'austira', 'Austria');
// reviewer's cases: a closer spelling beats a sound-alike; plural slips; reachable answers
function fixAny(text, want) {
  const hits = FO.qs.concat(FO.cats).filter((l) => l.items.some((it) => it.name === want));
  assert(hits.length, 'no list has ' + want);
  for (const l of hits) {
    const j = FO.judge(FO.buildPrompt({ c: l.id, t: 'any' }), text);
    const got = j.ok ? j.item.name : j.why === 'maybe' ? 'maybe:' + j.options.map((o) => o.name).join('/') : j.why;
    if (got === want || got.startsWith('maybe:' + want)) { checks++; return; }
  }
  assert.fail(`"${text}" never resolves to ${want}`);
}
[['bussels', 'Brussels'], ['carinet', 'Clarinet'], ['paiter', 'Painter'], ['spier man', 'Spider-Man'], ['johpur', 'Jodhpur'],
 ['lemonae', 'Lemonade'], ['slippes', 'Slippers'], ['tapass', 'Tapas'], ['dallass', 'Dallas'], ['tortoies', 'Tortoise'],
 ['georgetown', 'Georgetown'], ['helga hufflepuff', 'Helga Hufflepuff']].forEach(([t, w]) => fixAny(t, w));
// every answer's own name finds itself
let unreachable = [];
for (const l of FO.qs.concat(FO.cats)) {
  const p = FO.buildPrompt({ c: l.id, t: 'any' });
  for (const it of l.items) { const j = FO.judge(p, it.f); if (!j.ok || j.item !== it) unreachable.push(l.id + ':' + it.name); }
}
assert.strictEqual(unreachable.length, 0, 'unreachable: ' + unreachable.slice(0, 8).join(', '));
expect('fastfood', {}, "McDonald's", true);
expect('element', {}, 'unobtainium', false, 'unknown');

// rarity sanity: common < rare
if (has('fruit')) {
  const p = any('fruit');
  const a = FO.judge(p, 'apple'), r = FO.judge(p, 'rambutan');
  assert(a.tier.pts < r.tier.pts, 'apple should score less than rambutan');
  console.log('apple →', a.tier.name, '| rambutan →', r.tier.name);
}

// prompt generator: 2000 prompts, all viable, ids stable via spec rebuild
const rng = FO.rng('test');
const seen = new Set();
let lettered = 0;
for (let i = 0; i < 2000; i++) {
  const p = FO.makePrompt(rng, { minPool: 6 });
  if (p.cat.id === 'q-test-europe') continue;
  assert(p.pool.length >= 6, 'pool too small: ' + p.id);
  const q = FO.buildPrompt(JSON.parse(JSON.stringify(p.spec)));
  assert.strictEqual(q.id, p.id);
  assert.strictEqual(q.pool.length, p.pool.length);
  for (const it of p.pool.slice(0, 3)) assert(FO.judge(p, it.name).ok, `canonical "${it.name}" fails ${p.id}`);
  seen.add(p.id);
  if (p.spec.t !== 'any') lettered++;
}
console.log(`2000 generated prompts, ${seen.size} distinct; ${checks} answer checks passed`);
// no letter or spelling games: rare starting-letter prompts only, and no question asks for letters
assert(lettered < 2000 * 0.12, `too many letter prompts: ${lettered} of 2000`);
const LETTER_GAME = /\b(\d+ letters|letters? in it|with the letter|starts? with|starting with|ends? (with|in)|ending (with|in)|rhymes? with|contains? the (word|letters?)|spelled|vowels?|syllables?|palindromes?|anagrams?|double letters?)\b/i;
const games = FO.qs.filter((q) => LETTER_GAME.test(q.ask)).map((q) => q.ask);
assert.strictEqual(games.length, 0, 'letter-game questions: ' + games.slice(0, 5).join(' | '));
// each question is asked once, across the curated and the big bank
const asked = new Map(), twice = [];
for (const q of FO.qs.concat(FO.cats)) { const k = q.ask.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (asked.has(k)) twice.push(`${q.ask} (${asked.get(k)}, ${q.id})`); else asked.set(k, q.id); }
assert.strictEqual(twice.length, 0, 'asked twice: ' + twice.slice(0, 5).join(' | '));
// friendly mode: minEase only picks lists with plenty of everyday answers
const r3 = FO.rng('easy');
for (let i = 0; i < 200; i++) { const p = FO.makePrompt(r3, { minPool: 6, minEase: 10 }); assert(FO.ease(p.cat) >= 10, 'not friendly: ' + p.ask); }
// Daily Orbit and online rooms never use the big bank (other devices may not have it loaded yet),
// and the big bank never gets letter rules
const r4 = FO.rng('core');
for (let i = 0; i < 300; i++) { const p = FO.makePrompt(r4, { minPool: 10, core: true }); assert(!p.cat.deep, 'core prompt from the big bank: ' + p.ask); }
const r5 = FO.rng('deep');
for (let i = 0; i < 300; i++) { const p = FO.makePrompt(r5, { minPool: 6 }); if (p.cat.deep) assert.strictEqual(p.spec.t, 'any', 'letter rule on ' + p.ask); }
// Hebrew answers count: as written, with "the" (ה) on the front, typed on the English keyboard, and rules
// ("starting with B") still look at the English name
const judgeAny = (id, text) => FO.judge(any(id), text);
assert.strictEqual(judgeAny('fruit', 'בננה').item.name, 'Banana');
assert.strictEqual(judgeAny('fruit', 'הבננה').item.name, 'Banana');
assert.strictEqual(judgeAny('fruit', 'cbbv').item.name, 'Banana');
assert.strictEqual(judgeAny('country', 'צרפת').item.name, 'France');
assert.strictEqual(judgeAny('country', 'ןאשךט').item.name, 'Italy');
const startB = FO.buildPrompt({ c: 'fruit', t: 'start', v: 'b' });
assert(FO.judge(startB, 'בננה').ok, 'Hebrew name breaks a letter rule');
assert.strictEqual(FO.judge(startB, 'תפוח').why, 'rule');
// FarOut.extend: new answers and extra names, for a list that loads later and for one already played
FO.extend({ 'q-test-later': 'Reva LeSheva|רבע לשבע|reva le sheva:2; plum|שזיף' });
FO.addQuestions([{ id: 'q-test-later', theme: 'Food', ask: 'Name a test snack', what: 'a test snack', items: 'apple:5; pear:5; plum:4; fig:4; kiwi:4; date:3; lime:3; lemon:3; cherry:3; grape:2; guava:2; lychee:2; quince:1; medlar:1; sloe:1' }]);
const later = any('q-test-later');
assert.strictEqual(later.cat.n, 16);
assert.strictEqual(FO.judge(later, 'רבע לשבע').item.name, 'Reva LeSheva');
assert.strictEqual(FO.judge(later, 'reva lesheva').item.name, 'Reva LeSheva');
assert.strictEqual(FO.judge(later, 'שזיף').item.name, 'Plum');
FO.extend({ 'q-test-later': 'Bamba|במבה:3; fig|תאנה' });
assert.strictEqual(FO.judge(any('q-test-later'), 'במבה').item.name, 'Bamba');
assert.strictEqual(FO.judge(any('q-test-later'), 'תאנים').item.name, 'Fig');
// one Hebrew word for two answers: the player picks, and a used one drops out of the choice
FO.extend({ 'q-test-later': 'lime|ליים|לימון ירוק; lemon|לימון|לימון ירוק' });
const both = FO.judge(any('q-test-later'), 'לימון ירוק');
assert.deepStrictEqual(both.options.map((it) => it.name).sort(), ['Lemon', 'Lime']);
assert.strictEqual(FO.judge(any('q-test-later'), 'לימון ירוק', new Set([both.options.find((it) => it.name === 'Lime')])).item.name, 'Lemon');
// daily seed is deterministic
const d1 = FO.makePrompt(FO.rng('daily-2026-10-29'), { minPool: 10 }).id, d2 = FO.makePrompt(FO.rng('daily-2026-10-29'), { minPool: 10 }).id;
assert.strictEqual(d1, d2);
console.log('sample prompts:');
const r2 = FO.rng('show');
for (let i = 0; i < 8; i++) { const p = FO.makePrompt(r2); console.log('  ', p.ask, p.rule, `(${p.pool.length})`); }
console.log('ALL PASS');
