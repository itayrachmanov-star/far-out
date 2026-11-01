/* Far Out — text tools: normalising answers, edit distance, sound-alike keys,
   display casing and letter diffs for showing typo fixes. Pure, no DOM. */
(function () {
  'use strict';
  const FO = (window.FarOut = window.FarOut || {});

  // Hebrew answers count too: points dropped, final letters written plain (ם → מ), maqaf is a space.
  const HEB = /[א-ת]/, FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-֑ͯ-ֽֿ-ׇ]/g, '')
    .replace(/[ךםןףץ]/g, (c) => FINAL[c]).replace(/&/g, ' and ').replace(/\+/g, ' plus ').replace(/#/g, ' sharp ')
    .replace(/[^a-z0-9א-ת ]+/g, ' ').replace(/\s+/g, ' ').trim();
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
    if (HEB.test(k)) return soundHe(k);
    let s = k.replace(/[^a-z]/g, '');
    if (s.length < 3) return s;
    s = s.replace(/^(kn|gn|pn|wr|ps)/, (m) => m[1])
      .replace(/tch/g, 'ch').replace(/cch/g, 'k').replace(/sch/g, '8').replace(/sh/g, '8').replace(/ch/g, '9')
      .replace(/th/g, '7').replace(/ph/g, 'f').replace(/gh/g, '').replace(/wh/g, 'w').replace(/ck/g, 'k')
      .replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/q/g, 'k').replace(/x/g, 'ks').replace(/z/g, 's')
      .replace(/dg(?=[eiy])/g, 'j').replace(/y/g, 'i').replace(/(.)\1+/g, '$1');
    return s[0] + s.slice(1).replace(/[aeiouh]/g, '').replace(/(.)\1+/g, '$1');
  }
  // The same for Hebrew: "שוקלד" and "שוקולד", "בננות" and "בננה". Letters that sound alike are folded
  // (ק/כ/ח, ט/ת, ע/א, ס/ש), the vowel letters ו י א ה after the first letter and a plural ending are dropped.
  function soundHe(k) {
    let s = k.replace(/[^א-ת]/g, '');
    if (s.length > 3) s = s.replace(/(ימ|ות)$/, ''); // keys spell a final ם as מ
    s = s.replace(/[קח]/g, 'כ').replace(/ט/g, 'ת').replace(/ע/g, 'א').replace(/ס/g, 'ש');
    return s.length < 2 ? s : s[0] + s.slice(1).replace(/[ויאה]/g, '');
  }

  // Singular and plural are the same answer: "תאנים" is "תאנה", "בננות" is "בננה", "דגים" is "דג".
  const stemHe = (k) => (k.length >= 4 && HEB.test(k) ? k.replace(/(ימ|ות|ה|ת)$/, '') : k);

  // Typed with the keyboard in the other language (Israeli layout): "ןאשךט" is "italy", "cbbv" is "בננה".
  const EN_KEYS = "ertyuiopasdfghjkl;zxcvbnm,.qw", HE_KEYS = "קראטוןםפשדגכעיחלךףזסבהנמצתץ/'";
  const swapLayout = (s) => {
    const he = HEB.test(s), from = he ? HE_KEYS : EN_KEYS, to = he ? EN_KEYS : HE_KEYS;
    return [...String(s).toLowerCase()].map((c) => { const i = from.indexOf(c); return i < 0 ? c : to[i]; }).join('');
  };

  // Data is lowercase; restore display casing: "kfc" → KFC, "mcdonalds" → McDonalds, "st john" → St John.
  const NOT_ACRONYM = new Set(['st', 'mr', 'mrs', 'dr', 'jr', 'sr', 'ft', 'mt', 'vs', 'pt', 'nd', 'rd', 'th', 'ms', 'grrrl']);
  const MINOR = new Set(['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for', 'a', 'an', 'or', 'de', 'da', 'del', 'van', 'von', 'der', 'du', 'la', 'le', 'y']);
  const ROMAN = /^m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;
  const title = (s) => s.replace(/[a-z0-9]+/g, (w, at) => {
    if (at > 0 && s[at - 1] === "'") return w; // fireman's, o'clock stays lowercase after the apostrophe
    if (at > 0 && MINOR.has(w) && s[at - 1] === ' ') return w;
    if (at > 0 && w.length >= 2 && ROMAN.test(w) && !/^(mix|liv|mi|di|dim|mid|mild|civic|vivid|lid|ill)$/.test(w)) return w.toUpperCase(); // Henry VIII
    if (/^[b-df-hj-np-tv-xz]{2,5}s$/.test(w) && !/^(css|gps|sms|mms|rss|dns|ups|bbs|nhs|pps)$/.test(w) && !NOT_ACRONYM.has(w.slice(0, -1))) return w.slice(0, -1).toUpperCase() + 's'; // DVDs
    if (/^[b-df-hj-np-tv-xz]{2,5}$/.test(w) && !NOT_ACRONYM.has(w)) return w.toUpperCase();
    if (/^mc[a-z]{2}/.test(w)) return 'Mc' + w[2].toUpperCase() + w.slice(3);
    return w[0].toUpperCase() + w.slice(1);
  });

  /** Segments of `fixed` with the letters the player missed or mistyped marked {fix:true}. */
  function diff(typed, fixed) {
    if (HEB.test(typed) !== HEB.test(fixed)) return [{ t: String(fixed), fix: false }]; // answered in the other language
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

  FO.text = { HEB, norm, strip, letters, keyOf, dist, sound, stemHe, title, diff, swapLayout };
})();
