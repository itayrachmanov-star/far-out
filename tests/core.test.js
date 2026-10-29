// Node test of js/core.js against the real data files. Run: node tests/core.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
global.window = global;
require(path.join(__dirname, '../js/core.js'));
for (const f of fs.readdirSync(path.join(__dirname, '../data')).filter((f) => f.endsWith('.js')).sort()) require(path.join(__dirname, '../data', f));
const FO = window.FarOut;
console.log(`${FO.cats.length} categories, ${FO.cats.reduce((n, c) => n + c.items.length, 0)} answers, ${FO.countPrompts()} prompts`);

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
