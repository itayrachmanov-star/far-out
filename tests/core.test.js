// Node test of js/core.js against the real data files. Run: node tests/core.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
global.window = global;
require(path.join(__dirname, '../js/text.js'));
require(path.join(__dirname, '../js/core.js'));
for (const f of fs.readdirSync(path.join(__dirname, '../data')).filter((f) => f.endsWith('.js')).sort()) require(path.join(__dirname, '../data', f));
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
expect('country', { t: 'len', v: 5 }, 'chile', true);
expect('country', { t: 'len', v: 5 }, 'france', false, 'rule');
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
for (let i = 0; i < 2000; i++) {
  const p = FO.makePrompt(rng, { minPool: 6 });
  if (p.cat.id === 'q-test-europe') continue;
  assert(p.pool.length >= 6, 'pool too small: ' + p.id);
  const q = FO.buildPrompt(JSON.parse(JSON.stringify(p.spec)));
  assert.strictEqual(q.id, p.id);
  assert.strictEqual(q.pool.length, p.pool.length);
  for (const it of p.pool.slice(0, 3)) assert(FO.judge(p, it.name).ok, `canonical "${it.name}" fails ${p.id}`);
  seen.add(p.id);
}
console.log(`2000 generated prompts, ${seen.size} distinct; ${checks} answer checks passed`);
// daily seed is deterministic
const d1 = FO.makePrompt(FO.rng('daily-2026-10-29'), { minPool: 10 }).id, d2 = FO.makePrompt(FO.rng('daily-2026-10-29'), { minPool: 10 }).id;
assert.strictEqual(d1, d2);
console.log('sample prompts:');
const r2 = FO.rng('show');
for (let i = 0; i < 8; i++) { const p = FO.makePrompt(r2); console.log('  ', p.ask, p.rule, `(${p.pool.length})`); }
console.log('ALL PASS');
