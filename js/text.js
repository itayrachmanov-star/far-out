/* Far Out — text tools: normalising answers, edit distance, sound-alike keys,
   display casing and letter diffs for showing typo fixes. Pure, no DOM. */
(function () {
  'use strict';
  const FO = (window.FarOut = window.FarOut || {});

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/\+/g, ' plus ').replace(/#/g, ' sharp ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const strip = (s) => norm(s).replace(/^(the|a|an) /, '');
  const letters = (f) => f.replace(/[^a-z]/g, '');

  function singular(w) {
    if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /(ches|shes|sses|xes|zes|oes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    return w;
  }
  /** Matching key: lowercase, no accents/spaces/punctuation/leading "the", singular words. */
  const keyOf = (s) => strip(s).split(' ').map(singular).join('');

  /** Optimal-string-alignment distance with an early exit above `max`. */
  function dist(a, b, max) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > max) return max + 1;
    let p2 = null, p1 = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      let rowMin = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + cost);
        if (p2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      p2 = p1; p1 = cur;
    }
    return p1[n];
  }

  /** Sound-alike skeleton of a key, so "brocoli", "fillipines", "zuchini" land on the real spelling.
      English spelling rules folded together, doubled letters collapsed, later vowels dropped. */
  function sound(k) {
    let s = k.replace(/[^a-z]/g, '');
    if (s.length < 3) return s;
    s = s.replace(/^(kn|gn|pn|wr|ps)/, (m) => m[1])
      .replace(/tch/g, 'ch').replace(/cch/g, 'k').replace(/sch/g, '8').replace(/sh/g, '8').replace(/ch/g, '9')
      .replace(/th/g, '7').replace(/ph/g, 'f').replace(/gh/g, '').replace(/wh/g, 'w').replace(/ck/g, 'k')
      .replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/q/g, 'k').replace(/x/g, 'ks').replace(/z/g, 's')
      .replace(/dg(?=[eiy])/g, 'j').replace(/y/g, 'i').replace(/(.)\1+/g, '$1');
    return s[0] + s.slice(1).replace(/[aeiouh]/g, '').replace(/(.)\1+/g, '$1');
  }

  // Data is lowercase; restore display casing: "kfc" → KFC, "mcdonalds" → McDonalds, "st john" → St John.
  const NOT_ACRONYM = new Set(['st', 'mr', 'mrs', 'dr', 'jr', 'sr', 'ft', 'mt', 'vs', 'pt', 'nd', 'rd', 'th', 'ms', 'grrrl']);
  const title = (s) => s.replace(/[a-z0-9]+/g, (w) => {
    if (/^[b-df-hj-np-tv-xz]{2,5}$/.test(w) && !NOT_ACRONYM.has(w)) return w.toUpperCase();
    if (/^mc[a-z]{2}/.test(w)) return 'Mc' + w[2].toUpperCase() + w.slice(3);
    return w[0].toUpperCase() + w.slice(1);
  });

  /** Segments of `fixed` with the letters the player missed or mistyped marked {fix:true}. */
  function diff(typed, fixed) {
    const a = String(typed).toLowerCase(), b = String(fixed), bl = b.toLowerCase();
    const n = a.length, m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === bl[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const marks = new Array(m).fill(false);
    let i = 0, j = 0;
    while (j < m) {
      if (i < n && a[i] === bl[j]) { i++; j++; }
      else if (i < n && L[i + 1][j] >= L[i][j + 1]) i++;
      else { marks[j] = /[a-z0-9]/.test(bl[j]); j++; }
    }
    const segs = [];
    for (let k = 0; k < m; k++) {
      const last = segs[segs.length - 1];
      if (last && last.fix === marks[k]) last.t += b[k]; else segs.push({ t: b[k], fix: marks[k] });
    }
    return segs;
  }

  FO.text = { norm, strip, letters, keyOf, dist, sound, title, diff };
})();
