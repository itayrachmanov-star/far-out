/* Far Out — small DOM helpers shared by every screen. */
(function () {
  'use strict';
  const FO = window.FarOut;
  const UI = (FO.UI = {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  UI.$ = $; UI.$$ = $$;

  /** h('div', {class:'x', onclick: fn}, 'text', child, [more]) */
  UI.h = function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) if (sv != null) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
      }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  };

  // ---------- screens ----------
  const leaveHooks = [];
  UI.current = 's-home';
  UI.onLeave = (fn) => leaveHooks.push(fn);
  UI.show = function (id) {
    if (UI.current !== id) leaveHooks.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    for (const s of $$('.screen')) s.hidden = s.id !== id;
    UI.current = id;
    window.scrollTo(0, 0);
  };

  // ---------- toast ----------
  let toastT = 0;
  UI.toast = function (msg, ms = 2400) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    FO.Fx && FO.Fx.pop(t, 'rise-again');
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, ms);
  };

  /** Share sheet on phones (where allowed), else copy. */
  UI.share = async function (text, fallback) {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ text }); return true; } catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    return UI.copy(text, fallback);
  };

  /** Copy text; on refusal, reveal a selectable textarea instead. */
  UI.copy = async function (text, fallback) {
    try {
      await navigator.clipboard.writeText(text);
      UI.toast('Copied');
      return true;
    } catch (e) {
      if (fallback) {
        fallback.value = text;
        fallback.hidden = false;
        fallback.focus();
        fallback.select();
        UI.toast('Select the text and copy it');
      } else UI.toast('Copy is blocked here');
      return false;
    }
  };

  // ---------- storage (best-effort) ----------
  UI.store = {
    get(k, d) { try { const v = localStorage.getItem('fo.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('fo.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };

  // ---------- shared pieces ----------
  UI.badge = (tier, sub) => UI.h('span', { class: 'badge ' + tier.cls }, tier.name, sub ? UI.h('small', null, sub) : null);
  UI.missBadge = (label = 'Miss') => UI.h('span', { class: 'badge miss' }, label);
  UI.chip = (text, cls) => UI.h('span', { class: 'chip ' + (cls || '') }, text);
  UI.planet = (color, small) => UI.h('span', { class: 'planet' + (small ? ' sm' : ''), style: { '--sw': color } });
  UI.EMOJI = { 1: '🟥', 2: '🟧', 3: '🟨', 4: '🟩', 5: '🟦', 0: '⬛' };

  /** Plain-language reason for a missed answer. */
  UI.missText = function (p, j) {
    const typed = j.raw ? `“${j.raw}”` : 'That';
    if (j.why === 'rule') return `${j.item.name} is ${p.cat.what}, but not one ${p.rule}.`;
    if (j.why === 'repeat') return `You already used ${j.item.name} here.`;
    if (j.why === 'maybe') return `${typed} is close to more than one answer. Pick the one you meant.`;
    return `${typed} isn't on our star charts as ${p.what}. Check the spelling or try another.`;
  };

  /** "brocoli → Broccoli" with the fixed letters highlighted. */
  UI.fixLine = function (typed, name) {
    return UI.h('span', { class: 'fixline' }, UI.h('s', null, typed), UI.h('i', { 'aria-hidden': 'true' }, '→'),
      UI.h('b', null, FO.text.diff(typed, name).map((sg) => (sg.fix ? UI.h('mark', null, sg.t) : sg.t))));
  };

  /** Theme chips ("Everything", "Food & Drink"…); only themes that have prompts are shown. */
  UI.themePicker = function (current, onPick, disabled) {
    const has = (id) => FO.qs.some((l) => l.theme === id) || FO.cats.some((l) => l.theme === id);
    const opts = [{ id: 'all', name: 'Everything' }].concat(FO.THEMES.filter((t) => has(t.id)));
    const wrap = UI.h('div', { class: 'themes', role: 'group', 'aria-label': 'Theme' });
    const paint = (cur) => wrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.th === cur)));
    for (const t of opts) {
      wrap.append(UI.h('button', { type: 'button', class: 'theme-chip', 'data-th': t.id, 'aria-pressed': String(t.id === current), disabled: disabled || null,
        onclick: () => { paint(t.id); onPick(t.id); } }, t.name));
    }
    return wrap;
  };

  /** "Did you mean…" buttons. onPick(item) runs when one is chosen. */
  UI.didYouMean = function (options, onPick) {
    return UI.h('div', { class: 'dym', role: 'group', 'aria-label': 'Did you mean' }, UI.h('span', null, 'Did you mean'),
      options.map((it) => UI.h('button', { type: 'button', class: 'dym-btn', onclick: () => onPick(it) }, it.name)),
      UI.h('span', null, '?'));
  };

  /** "Farther out" chips: real answers rarer than the one given. */
  UI.farther = function (p, given, max = 4, exclude) {
    const rarer = FO.spectrum(p, exclude || (given ? new Set([given.item]) : null), 2)
      .filter((x) => !given || x.tier.c < given.tier.c).slice(0, max);
    if (given && given.tier.c === 1) return UI.h('div', { class: 'farther' }, UI.h('b', null, 'Nothing farther out. Top-tier find.'));
    if (!rarer.length) return null;
    return UI.h('div', { class: 'farther' }, UI.h('b', null, given ? 'Farther out:' : 'You could have said:'),
      rarer.map((x) => UI.chip(x.item.name, x.tier.cls)));
  };
})();
