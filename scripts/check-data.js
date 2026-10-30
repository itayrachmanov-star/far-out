// Checks question files before they join the bank. Run: node scripts/check-data.js data/q-new-1.js [more files]
// Loads the whole bank, then reports for the given files: questions that failed to load, duplicate ids or asks,
// answers that their own name cannot reach, thin lists, lopsided ratings and letter-game asks.
// Print every ask already in the bank: node scripts/check-data.js --asks
const fs = require('fs'), path = require('path');
global.window = global;
require(path.join(__dirname, '../js/text.js'));
require(path.join(__dirname, '../js/core.js'));
const FO = window.FarOut, dataDir = path.join(__dirname, '../data');
const args = process.argv.slice(2);
const targets = new Set(args.filter((a) => !a.startsWith('--')).map((f) => path.resolve(f)));
const owner = new Map(); // list id -> file

let current = null;
const wrap = (fn) => (arr) => {
  for (const d of arr) if (d && d.id && !owner.has(d.id)) owner.set(d.id, current);
  if (targets.has(current)) defs.push(...arr.map((d) => Object.assign({ file: current }, d)));
  return fn(arr);
};
const defs = [];
FO.addQuestions = wrap(FO.addQuestions);
FO.addCategories = wrap(FO.addCategories);
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(dataDir, f));
for (const f of targets) if (!files.includes(f)) files.push(f);
for (const f of files) {
  current = f;
  try { require(f); } catch (e) { console.log(`ERROR ${path.basename(f)} does not load: ${e.message}`); if (targets.has(f)) process.exitCode = 1; }
}

if (args.includes('--asks')) {
  for (const l of FO.qs) console.log(l.ask);
  for (const l of FO.cats) console.log(l.ask);
  process.exit(0);
}

const askKey = (s) => FO.text.norm(s).replace(/^name (a|an|the|some)? ?/, '');
const askOwner = new Map();
for (const l of FO.qs.concat(FO.cats)) if (!targets.has(owner.get(l.id))) askOwner.set(askKey(l.ask), l.id);
const LETTER_GAME = /\b(\d+ letters|letters? in it|with the letter|starts? with|starting with|ends? (with|in)|ending (with|in)|rhymes? with|contains? the (word|letters?)|spelled|vowels?|syllables?|palindromes?|anagrams?|double letters?)\b/i;

let problems = 0, warnings = 0, ok = 0, answers = 0;
const bad = (m) => { problems++; console.log('FIX  ' + m); };
const warn = (m) => { warnings++; console.log('WARN ' + m); };
const seenAsk = new Map();
for (const d of defs) {
  const where = `${path.basename(d.file)} ${d.id}`;
  const l = FO.catById[d.id];
  if (!l || owner.get(d.id) !== d.file) { bad(`${where}: did not load (${!d.id ? 'no id' : owner.get(d.id) !== d.file ? 'id already used in ' + path.basename(owner.get(d.id)) : 'fewer than 15 answers or bad format'})`); continue; }
  if (!/^Name /.test(d.ask)) warn(`${where}: ask should start with "Name": ${d.ask}`);
  if (LETTER_GAME.test(d.ask)) bad(`${where}: letter or spelling game, not wanted: ${d.ask}`);
  const ak = askKey(d.ask);
  if (askOwner.has(ak)) bad(`${where}: same ask as ${askOwner.get(ak)}: ${d.ask}`);
  if (seenAsk.has(ak)) bad(`${where}: same ask as ${seenAsk.get(ak)} in these files`);
  seenAsk.set(ak, d.id);
  const p = FO.buildPrompt({ c: d.id, t: 'any' });
  const unreachable = l.items.filter((it) => { const j = FO.judge(p, it.f); return !j.ok || j.item !== it; });
  if (unreachable.length) bad(`${where}: answers their own name cannot reach (an alias or near-duplicate swallows them): ${unreachable.slice(0, 6).map((it) => it.name).join(', ')}`);
  const n = l.items.length;
  answers += n;
  if (n < 30) warn(`${where}: only ${n} answers; aim for 40+ (open "Name something" questions 100+)`);
  const by = [0, 0, 0, 0, 0, 0];
  l.items.forEach((it) => by[it.c]++);
  if (!by[5]) warn(`${where}: no answer rated 5 (what most people say first)`);
  if (by[1] + by[2] < n * 0.25) warn(`${where}: only ${by[1] + by[2]} of ${n} answers rated 1-2; rare answers are the point of the game`);
  if (by[5] > n * 0.3) warn(`${where}: ${by[5]} of ${n} answers rated 5; keep 5 for the handful everyone says`);
  if (!unreachable.length) ok++;
}
console.log(`\n${defs.length} questions checked, ${ok} clean, ${answers} answers. ${problems} to fix, ${warnings} warnings.`);
console.log(`Bank now: ${FO.qs.length} questions, ${FO.cats.length} categories.`);
if (problems) process.exitCode = 1;
