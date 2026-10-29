/* Far Out — effects: warp starfield, particle bursts, confetti, synth sound. */
(function () {
  'use strict';
  const FO = window.FarOut;
  const Fx = (FO.Fx = {});
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  Fx.reduce = reduce;

  // ---------- starfield ----------
  const cv = document.getElementById('sky');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const stars = [], parts = [];
  let speed = 0.35, boost = 0, tint = [235, 232, 245], tintT = 0, last = performance.now();

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = cv.width = Math.floor(innerWidth * DPR);
    H = cv.height = Math.floor(innerHeight * DPR);
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
  }
  function spawn(s, far) {
    s.x = (Math.random() - 0.5) * 2;
    s.y = (Math.random() - 0.5) * 2;
    s.z = far ? 1 : Math.random() * 0.9 + 0.1;
    s.pz = s.z;
    s.hue = Math.random();
  }
  for (let i = 0; i < 420; i++) { const s = {}; spawn(s, false); stars.push(s); }

  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const TIER_RGB = { 5: '#a9c8ff', 4: '#7fe3d1', 3: '#ffd166', 2: '#ff8a4c', 1: '#ff3d7f' };
  Fx.tierRGB = (c) => hex(TIER_RGB[c] || '#ffffff');
  Fx.tierHex = (c) => TIER_RGB[c] || '#ffffff';

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    boost *= Math.pow(0.12, dt);
    tintT = Math.max(0, tintT - dt * 0.6);
    const v = (speed + boost) * (reduce ? 0.15 : 1);
    ctx.fillStyle = 'rgba(5,6,13,' + (boost > 0.6 ? 0.35 : 0.9) + ')';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.42, sc = Math.max(W, H) * 0.5;
    for (const s of stars) {
      s.pz = s.z;
      s.z -= v * dt * 0.25;
      if (s.z <= 0.02) { spawn(s, true); continue; }
      const x = cx + (s.x / s.z) * sc, y = cy + (s.y / s.z) * sc;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) { spawn(s, true); continue; }
      const px = cx + (s.x / s.pz) * sc, py = cy + (s.y / s.pz) * sc;
      const b = Math.min(1, (1 - s.z) * 1.3);
      const mix = tintT * (0.4 + s.hue * 0.6);
      const r = Math.round(235 + (tint[0] - 235) * mix), g = Math.round(232 + (tint[1] - 232) * mix), bl = Math.round(245 + (tint[2] - 245) * mix);
      ctx.strokeStyle = `rgba(${r},${g},${bl},${b})`;
      ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.2) * DPR;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x + 0.01, y);
      ctx.stroke();
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.vx *= 1 - 1.5 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const a = Math.min(1, p.life / p.max * 1.6);
      ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${a})`;
      if (p.rect) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.s, -p.s * 0.4, p.s * 2, p.s * 0.8); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * a, 0, 6.283); ctx.fill();
      }
    }
    if (!document.hidden) requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); requestAnimationFrame(frame); } });
  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  /** Jump to warp. power 0..3, tier colours the streaks. */
  Fx.warp = function (power, tierC) {
    boost = Math.max(boost, power * 2.2);
    if (tierC) { tint = Fx.tierRGB(tierC); tintT = 1; }
  };
  Fx.cruise = (s) => { speed = s; };

  /** Spark burst from a screen point (CSS px). */
  Fx.burst = function (x, y, tierC, n = 34) {
    if (reduce) n = Math.round(n / 4);
    const c = Fx.tierRGB(tierC);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, sp = (120 + Math.random() * 420) * DPR;
      parts.push({ x: x * DPR, y: y * DPR, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80 * DPR, g: 380 * DPR,
        s: (1.5 + Math.random() * 3) * DPR, life: 0.6 + Math.random() * 0.7, max: 1.3, c, rot: 0, vr: 0 });
    }
  };
  Fx.confetti = function (n = 160) {
    if (reduce) n = 30;
    for (let i = 0; i < n; i++) {
      const c = Fx.tierRGB(1 + Math.floor(Math.random() * 5));
      parts.push({ x: Math.random() * W, y: -20 * DPR - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 160 * DPR,
        vy: (60 + Math.random() * 160) * DPR, g: 140 * DPR, s: (3 + Math.random() * 4) * DPR, life: 3 + Math.random() * 2,
        max: 5, c, rect: true, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
    }
  };
  Fx.burstAt = function (el, tierC, n) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    Fx.burst(r.left + r.width / 2, r.top + r.height / 2, tierC, n);
  };

  Fx.shake = function (el) {
    if (!el || reduce) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  };
  Fx.pop = function (el, cls = 'pop') {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  };
  Fx.countUp = function (el, from, to, ms = 700) {
    if (!el) return;
    if (reduce || from === to) { el.textContent = to.toLocaleString(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // ---------- sound (synthesised, no files) ----------
  let ac = null, muted = false;
  try { muted = localStorage.getItem('fo.muted') === '1'; } catch (e) { /* storage blocked */ }
  Fx.isMuted = () => muted;
  Fx.setMuted = (m) => { muted = m; try { localStorage.setItem('fo.muted', m ? '1' : '0'); } catch (e) { /* ignore */ } };
  function audio() {
    if (muted) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, t, dur, type = 'sine', vol = 0.12, slide = 0) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), at = a.currentTime + t;
    o.type = type; o.frequency.setValueAtTime(freq, at);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(a.destination);
    o.start(at); o.stop(at + dur + 0.05);
  }
  function whoosh(dur = 0.7, vol = 0.18) {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, a.currentTime);
    f.frequency.exponentialRampToValueAtTime(3200, a.currentTime + dur * 0.8);
    g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  }
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
  Fx.sfx = {
    unlock() { audio(); },
    key() { tone(1400 + Math.random() * 300, 0, 0.03, 'square', 0.015); },
    ok(c) { // rarer = longer, higher arpeggio
      const n = 7 - c;
      for (let i = 0; i < n; i++) tone(SCALE[i], i * 0.07, 0.22, 'triangle', 0.11);
      if (c <= 2) { whoosh(0.9, 0.14); tone(SCALE[n] * 2, n * 0.07, 0.5, 'sine', 0.07); }
    },
    bad() { tone(160, 0, 0.18, 'sawtooth', 0.08, 0.6); tone(120, 0.1, 0.25, 'sawtooth', 0.07, 0.6); },
    tick() { tone(980, 0, 0.05, 'square', 0.035); },
    skip() { whoosh(0.35, 0.08); },
    flip() { tone(420, 0, 0.08, 'triangle', 0.06, 1.6); },
    lone() { tone(1318.5, 0, 0.3, 'sine', 0.09); tone(1760, 0.09, 0.4, 'sine', 0.07); },
    clash() { tone(220, 0, 0.2, 'square', 0.06, 0.7); tone(233, 0, 0.2, 'square', 0.06, 0.7); },
    win() { [0, 2, 4, 5, 6].forEach((k, i) => tone(SCALE[k], i * 0.12, 0.4, 'triangle', 0.1)); whoosh(1.2, 0.1); },
    over() { [4, 2, 0].forEach((k, i) => tone(SCALE[k] / 2, i * 0.18, 0.45, 'sine', 0.1)); },
  };
})();
