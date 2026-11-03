/* Far Out — Crew (online) game logic. The host runs the rules and publishes the game
   state in its presence (`g`); every player publishes name, colour, answers and reactions.
   Twists: Same Wavelength rounds (match your crew instead of avoiding it) and a Supernova
   finale (double points). Optional teams; the most-reacted answer is the Crowd Favourite.
   Rendering lives in crew-view.js (FO.CrewView). */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI;
  const COLORS = ['#ff8a4c', '#7fe3d1', '#a9c8ff', '#ffd166', '#ff3d7f', '#b98cff', '#8cff9a', '#ff6bd6'];
  const CODE_CHARS = 'BCDFGHJKLMNPQRSTVWXZ';
  const GRACE_MS = 1500, MAX_PLAYERS = 10, PHASES = ['lobby', 'ask', 'reveal', 'final'];
  const V = () => FO.CrewView;

  const C = {
    sess: null, kind: null, code: '', isHost: false, connected: false,
    me: { n: UI.store.get('name', ''), col: UI.store.get('color', COLORS[Math.floor(Math.random() * COLORS.length)]), j: 0 },
    peers: [], host: null, hostId: null, g: null, hg: null, phaseKey: '', deadline: 0, hostDeadline: 0, leftPushed: 0,
    prompt: null, myA: null, myW: '', myR: null, myRm: 0, entries: null, rng: null, recent: null, avoid: [],
    stopLoop: null, hostMissing: 0, gone: false,
  };

  const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const int = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : d);
  /** Scores travel as [[peerId, points], …] (presence keys must stay identifier-safe). */
  const scores = (g) => new Map(g && Array.isArray(g.sc) ? g.sc : []);

  // ---------- presence ----------
  function myPresence() {
    const p = { n: C.me.n, col: C.me.col, j: C.me.j };
    if (C.isHost) { p.host = true; p.g = C.hg; }
    if (C.myA) p.a = { r: C.myA.r, l: C.myA.l.slice(), d: C.myA.d };
    if (C.myW) p.w = C.myW;
    if (C.myR) p.re = C.myR;
    if (C.myRm) p.rm = C.myRm;
    return fit(p);
  }
  /** The claude.ai room caps presence at 4 KiB; shorten reveal text when a big crew gets close. */
  const bytes = (o) => new TextEncoder().encode(JSON.stringify(o)).length;
  function fit(p) {
    if (!p.g || bytes(p) < 3700) return p;
    for (const n of [20, 12, 0]) {
      if (Array.isArray(p.g.res)) p.g = Object.assign({}, p.g, { res: p.g.res.map((r) => Object.assign({}, r, { a: r.c ? r.a.slice(0, n || 8) : '' })) });
      if (bytes(p) < 3700) break;
    }
    return p;
  }
  const push = () => C.sess && C.sess.set(myPresence());

  /** Game state from the host's presence: untrusted, so rebuild it field by field. */
  function cleanGame(g) {
    if (!g || typeof g !== 'object' || !PHASES.includes(g.ph)) return null;
    const out = { ph: g.ph, gid: int(g.gid, 0, 1e6, 0), r: int(g.r, 0, 99, 0), R: int(g.R, 1, 30, 8), T: int(g.T, 5, 120, 30), left: int(g.left, 0, 120000, 0), th: str(g.th, 12) || 'all',
      tw: int(g.tw, 0, 1, 1), tt: g.tt === 2 ? 2 : 0, k: g.k === 'w' || g.k === 's' ? g.k : 'n' };
    if (Array.isArray(g.tm)) out.tm = g.tm.slice(0, 12).filter((e) => Array.isArray(e) && typeof e[0] === 'string').map((e) => [e[0].slice(0, 64), e[1] ? 1 : 0]);
    if (g.fav && typeof g.fav === 'object') out.fav = { a: str(g.fav.a, 40), p: str(g.fav.p, 64), n: int(g.fav.n, 0, 99, 0) };
    if (g.s && typeof g.s === 'object') out.s = { c: str(g.s.c, 40), t: str(g.s.t, 10), v: typeof g.s.v === 'number' ? int(g.s.v, 1, 30, 5) : str(g.s.v, 1) || undefined };
    if (Array.isArray(g.res)) out.res = g.res.slice(0, 40).map((r) => ({ p: str(r && r.p, 64), a: str(r && r.a, 48), c: int(r && r.c, 0, 5, 0), pts: int(r && r.pts, 0, 1000, 0), f: r && ['L', 'X', 'M'].includes(r.f) ? r.f : '', m: str(r && r.m, 10) }));
    if (Array.isArray(g.sc)) out.sc = g.sc.slice(0, 20).filter((e) => Array.isArray(e) && typeof e[0] === 'string').map((e) => [e[0].slice(0, 64), int(e[1], 0, 1e6, 0)]);
    if (out.ph !== 'lobby' && out.ph !== 'final' && !out.s) return null;
    return out;
  }
  function clean(x) {
    const p = x.p || {};
    const out = { n: str(p.n, 16).trim() || 'Pilot', col: /^#[0-9a-f]{6}$/i.test(p.col) ? p.col : '#9396b8', j: +p.j || 0, w: str(p.w, 40), rm: int(p.rm, 0, 1e6, 0) };
    if (p.re && typeof p.re === 'object' && p.re.m && typeof p.re.m === 'object') {
      out.re = { r: str(p.re.r, 20), m: Object.fromEntries(Object.entries(p.re.m).slice(0, 40).filter(([i, k]) => /^\d{1,2}$/.test(i) && Number.isInteger(k) && k >= 0 && k < 4)) };
    }
    if (p.a && typeof p.a === 'object') {
      const l = (Array.isArray(p.a.l) ? p.a.l : []).slice(0, 3).map((s) => str(s, 48)).filter(Boolean);
      out.a = { r: +p.a.r || 0, d: !!p.a.d, l: l.filter((s, i) => l.findIndex((t) => FO.text.keyOf(t) === FO.text.keyOf(s)) === i) };
    }
    return { id: String(x.id), isMe: !!x.isMe, p: out, claimsHost: !!p.host, g: p.g, raw: !!p.n };
  }

  function onPeers(list) {
    const all = list.map(clean).filter((x) => x.raw || x.isMe);
    if (!C.isHost) {
      // The host is pinned: PeerJS knows its id; in a claude.ai room it's the first host we saw.
      if (C.sess && C.sess.hostId) C.hostId = C.sess.hostId;
      else if (!C.hostId) { const h = all.filter((x) => x.claimsHost && !x.isMe).sort((a, b) => a.p.j - b.p.j)[0]; if (h) C.hostId = h.id; }
      const h = all.find((x) => x.id === C.hostId && x.claimsHost);
      C.host = h || null;
      if (h) h.p.host = true;
    }
    C.peers = all.sort((a, b) => a.p.j - b.p.j || (a.id < b.id ? -1 : 1)).slice(0, MAX_PLAYERS);
    if (C.isHost || C.host) { C.hostMissing = 0; C.gone = false; } else if (!C.hostMissing) C.hostMissing = performance.now();
    applyGame(C.isHost ? C.hg : C.host && cleanGame(C.host.g));
    V().players();
    if (C.isHost) hostStep();
  }

  const nameOf = (id) => { const pl = C.peers.find((x) => x.id === id); return pl ? pl.p.n : 'Someone who left'; };
  const colorOf = (id) => { const pl = C.peers.find((x) => x.id === id); return pl ? pl.p.col : '#5d6087'; };
  const meId = () => { const m = C.peers.find((x) => x.isMe); return m ? m.id : null; };

  // ---------- phases (everyone) ----------
  function applyGame(g) {
    if (!g) return;
    C.g = g;
    const key = `${g.gid}:${g.ph}:${g.r}`, now = performance.now(), left = Math.max(0, Math.min(120000, +g.left || 0));
    if (key === C.phaseKey) {
      if (C.deadline - now > left + 1500) C.deadline = now + left; // the host refreshes `left` for late joiners
      V().refresh();
      return;
    }
    C.phaseKey = key;
    C.deadline = now + left;
    C.myW = '';
    if (g.s) C.prompt = FO.buildPrompt(g.s);
    if (C.prompt && C.prompt.missing && !C.isHost) { V().outdated(); return; }
    if (g.ph === 'ask') {
      C.myA = { r: g.r, l: [], d: false };
      push();
      V().ask();
    } else if (g.ph === 'reveal') V().reveal();
    else if (g.ph === 'final') V().final();
    else { C.myA = null; V().lobby(); }
  }

  // ---------- my actions ----------
  /** Send this round's one answer; once it's in, it's final. Returns {ok, msg, options, fixed:{typed,name}}.
      Typos are stored fixed; answers the game doesn't know are turned away, as in every other mode
      (nobody votes on what counts), so a slip doesn't cost the round. */
  function addAnswer(text) {
    const g = C.g, a = C.myA;
    if (!g || g.ph !== 'ask' || !a || a.d) return { msg: 'Answers are locked.' };
    let t = text.trim().slice(0, 48);
    if (!t) return { ok: true };
    if (!FO.text.keyOf(t)) return { msg: 'Use letters or numbers.' };
    const j = FO.judge(C.prompt, t);
    if (j.why === 'maybe') return { options: j.options };
    if (j.why === 'rule') return { msg: `${j.item.name} is ${C.prompt.cat.what}, but not one ${C.prompt.rule}.` };
    if (j.why === 'unknown') return { msg: UI.missText(C.prompt, j) };
    const fixed = j.ok && j.fuzzy ? { typed: t, name: j.item.name } : null;
    if (j.ok) t = j.item.name; // the host judges this name, which it has even before its Hebrew names arrive
    a.l = [t];
    a.d = true;
    C.playedGid = g.gid; // for XP: this player took part in this game
    push();
    return { ok: true, fixed };
  }
  function lock() { if (C.myA && !C.myA.d) { C.myA.d = true; push(); } }
  /** React to answer card i of this reveal with emoji k (0-3); the same one again takes it back. */
  function react(i, k) {
    const g = C.g;
    if (!g || g.ph !== 'reveal') return;
    const key = `${g.gid}:${g.r}`;
    if (!C.myR || C.myR.r !== key) C.myR = { r: key, m: {} };
    if (C.myR.m[i] === k) delete C.myR.m[i]; else C.myR.m[i] = k;
    push();
  }
  function wantRematch() { if (C.g) { C.myRm = C.g.gid; push(); } }

  // ---------- host rules ----------
  function setPhase(patch) {
    C.hg = Object.assign({}, C.hg, patch);
    C.hostDeadline = performance.now() + (patch.left || 0);
    C.leftPushed = performance.now();
    push();
    applyGame(C.hg);
  }
  function startGame() {
    if (!C.isHost) return;
    C.rng = FO.rng(Date.now() + ':' + Math.random());
    C.recent = new Set();
    C.avoid = [];
    // Teams alternate by when players joined, fixed for the whole game.
    const tm = C.hg.tt === 2 && C.peers.length >= 2 ? C.peers.map((pl, i) => [pl.id, i % 2]) : null;
    C.hg = Object.assign({}, C.hg, { gid: (C.hg.gid || 0) + 1, r: 0, sc: [], res: null, tm, fav: null });
    nextRound();
  }
  function nextRound() {
    const p = FO.makePrompt(C.rng, { minPool: 10, recent: C.recent, avoid: C.avoid, theme: C.hg.th || 'all', minEase: 8, core: true });
    C.recent.add(p.id);
    // Twists: the last round is a Supernova (double points); rounds 3, 7 and 11 are Same Wavelength.
    const r = (C.hg.r || 0) + 1, R = C.hg.R;
    const k = !C.hg.tw ? 'n' : r === R && R > 1 ? 's' : r % 4 === 3 && C.peers.length >= 2 ? 'w' : 'n';
    setPhase({ ph: 'ask', r, k, s: p.spec, left: C.hg.T * 1000, res: null });
  }
  function backToLobby() { setPhase({ ph: 'lobby', gid: (C.hg.gid || 0) + 1, r: 0, sc: [], res: null, s: null, left: 0, tm: null, fav: null, k: 'n' }); }
  function setting(k, v) { if (C.isHost && C.hg.ph === 'lobby') { C.hg = Object.assign({}, C.hg, { [k]: v }); push(); V().refresh(); } }

  function collect() {
    const g = C.hg, p = FO.buildPrompt(g.s), entries = [];
    for (const pl of C.peers) {
      const a = pl.p.a;
      const list = a && a.r === g.r ? a.l.slice(0, 1) : [];
      if (!list.length) { entries.push({ pid: pl.id, text: '', j: { ok: false, why: 'none' } }); continue; }
      const used = new Set();
      for (const text of list) {
        const j = FO.judge(p, text, used);
        if (j.ok) used.add(j.item);
        entries.push({ pid: pl.id, text, j });
      }
    }
    C.entries = entries;
    score();
  }

  function score() {
    const groups = new Map();
    for (const e of C.entries) {
      if (e.j.ok) { e.key = 'i:' + e.j.item.name; e.c = e.j.tier.c; e.name = e.j.item.name; }
      else continue;
      if (!groups.has(e.key)) groups.set(e.key, new Set());
      groups.get(e.key).add(e.pid);
    }
    const multi = C.peers.length >= 2, wave = C.hg.k === 'w' && multi, mult = C.hg.k === 's' ? 2 : 1;
    const res = C.entries.map((e) => {
      if (!e.key) {
        const m = e.j.why === 'none' ? 'none' : e.j.why === 'rule' ? 'rule' : e.j.why === 'repeat' ? 'repeat' : 'unknown';
        return { p: e.pid, a: (e.j.item ? e.j.item.name : e.text).slice(0, 40), c: 0, pts: 0, m };
      }
      const n = groups.get(e.key).size, base = FO.TIERS[e.c].pts;
      // Same Wavelength pays for agreeing: 10, plus 40 for every other player with the same answer.
      if (wave) return { p: e.pid, a: e.name.slice(0, 40), c: e.c, pts: (10 + 40 * (n - 1)) * mult, f: n > 1 ? 'M' : '' };
      const pts = !multi ? base : n === 1 ? Math.round(base * 1.5) : Math.round(base / n);
      return { p: e.pid, a: e.name.slice(0, 40), c: e.c, pts: pts * mult, f: !multi ? '' : n === 1 ? 'L' : 'X' };
    });
    res.sort((a, b) => (a.c === 0) !== (b.c === 0) ? (a.c === 0 ? -1 : 1) : b.c - a.c || a.pts - b.pts);
    const sc = scores(C.hg);
    for (const pl of C.peers) if (!sc.has(pl.id)) sc.set(pl.id, 0);
    for (const r of res) sc.set(r.p, (sc.get(r.p) || 0) + r.pts);
    setPhase({ ph: 'reveal', res, sc: [...sc], left: 4500 + res.length * 900 });
  }

  function hostStep() {
    const g = C.hg, now = performance.now();
    if (!g) return;
    if (g.ph === 'ask') {
      const all = C.peers.length > 0 && C.peers.every((pl) => pl.p.a && pl.p.a.r === g.r && pl.p.a.d);
      if (all || now > C.hostDeadline + GRACE_MS) return collect();
    } else if (g.ph === 'reveal' && now > C.hostDeadline) {
      C.hg = Object.assign({}, C.hg, { fav: crowdFavourite() });
      return g.r >= g.R ? setPhase({ ph: 'final', left: 0, res: null }) : nextRound();
    }
    // Keep `left` fresh so late joiners and reloaded tabs see the real clock.
    if (g.ph !== 'lobby' && g.ph !== 'final' && now - C.leftPushed > 2000) {
      C.leftPushed = now;
      C.hg = Object.assign({}, C.hg, { left: Math.max(0, Math.round(C.hostDeadline - now)) });
      push();
    }
  }

  /** The answer with the most reactions so far this game (one per player per card). */
  function crowdFavourite() {
    const g = C.hg, key = `${g.gid}:${g.r}`, count = new Map();
    for (const pl of C.peers) {
      const re = pl.p.re;
      if (re && re.r === key) for (const i of Object.keys(re.m)) count.set(+i, (count.get(+i) || 0) + 1);
    }
    let best = g.fav || null;
    for (const [i, n] of count) { const r = (g.res || [])[i]; if (r && r.c && (!best || n > best.n)) best = { a: r.a, p: r.p, n }; }
    return best;
  }

  function step() {
    const g = C.g, left = C.deadline - performance.now();
    V().tick(left);
    if (g && g.ph === 'ask' && left <= 0 && C.myA && !C.myA.d) { V().flushInput(); lock(); }
    // Clients nudge the host when a reveal is over, in case the host's tab is throttled in the background.
    if (!C.isHost && g && g.ph === 'reveal' && left <= 0 && !C.myW) { C.myW = C.phaseKey; push(); }
    if (C.isHost) hostStep();
    else if (C.sess && !C.gone && C.hostMissing && performance.now() - C.hostMissing > 8000) { C.gone = true; V().hostGone(); }
  }

  /** A tick that keeps running in background tabs (workers aren't throttled like timers). */
  function ticker(fn, ms) {
    try {
      const url = URL.createObjectURL(new Blob([`setInterval(function(){postMessage(0)},${ms})`], { type: 'text/javascript' }));
      const w = new Worker(url);
      w.onmessage = fn;
      return () => { w.terminate(); URL.revokeObjectURL(url); };
    } catch (e) {
      const id = setInterval(fn, ms);
      return () => clearInterval(id);
    }
  }

  // ---------- session ----------
  async function connect(code, host) {
    C.me.n = C.me.n.trim().slice(0, 16) || 'Pilot';
    C.me.j = Date.now();
    UI.store.set('name', C.me.n);
    UI.store.set('color', C.me.col);
    leave();
    C.code = code;
    C.isHost = host;
    if (host) C.hg = { ph: 'lobby', gid: 1, r: 0, R: 8, T: 30, th: 'all', tw: 1, tt: 0, sc: [], left: 0 };
    C.sess = await FO.Net.open(code, host);
    C.kind = C.sess.kind;
    C.hostMissing = performance.now();
    C.gone = false;
    C.sess.onStatus((s) => {
      C.connected = !!s.connected;
      V().net();
      if (s.error === 'full') { C.gone = true; V().message('Room is full', `This room already has ${MAX_PLAYERS} players.`); }
      else if (s.error === 'host-left' && !C.gone) { C.gone = true; V().hostGone(); }
    });
    C.sess.onPeers(onPeers);
    push();
    if (host) applyGame(C.hg); else V().waiting();
    C.stopLoop = ticker(step, 200);
    UI.onLeave(leave);
  }
  async function create() {
    for (let i = 0; i < 3; i++) {
      try { return await connect(newCode(), true); }
      catch (e) { if ((e && e.type) !== 'unavailable-id') throw e; }
    }
  }
  const join = (code) => connect(code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4), false);
  function leave() {
    if (C.stopLoop) C.stopLoop();
    if (C.sess) { try { C.sess.close(); } catch (e) { /* already closed */ } }
    Object.assign(C, { sess: null, stopLoop: null, peers: [], host: null, hostId: null, g: null, hg: null, phaseKey: '', prompt: null,
      myA: null, myW: '', myR: null, myRm: 0, isHost: false, connected: false });
  }

  FO.Crew = { state: C, COLORS, create, join, leave, addAnswer, lock, react, wantRematch, startGame, backToLobby, setting, nameOf, colorOf, meId, scores };
})();
