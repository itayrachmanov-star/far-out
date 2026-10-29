/* Far Out — result card image (1080×1350) for sharing to chats and stories. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx;
  const W = 1080, H = 1350;
  const COLORS = { 1: '#ff3d7f', 2: '#ff8a4c', 3: '#ffd166', 4: '#7fe3d1', 5: '#a9c8ff', 0: '#262b47' };

  async function draw(r) {
    try { await document.fonts.ready; } catch (e) { /* fall back to system fonts */ }
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#05060d'; x.fillRect(0, 0, W, H);
    const glow = x.createRadialGradient(W * 0.8, H * 0.15, 20, W * 0.8, H * 0.15, 700);
    glow.addColorStop(0, 'rgba(255,61,127,.35)'); glow.addColorStop(1, 'rgba(255,61,127,0)');
    x.fillStyle = glow; x.fillRect(0, 0, W, H);
    const rng = FO.rng(r.title + r.dist);
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(236,233,245,${0.2 + rng() * 0.7})`; x.beginPath(); x.arc(rng() * W, rng() * H, rng() * 2.4 + 0.4, 0, 6.283); x.fill(); }

    const D = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif', B = '"Atkinson Hyperlegible", system-ui, sans-serif';
    x.textBaseline = 'alphabetic';
    x.fillStyle = '#ece9f5'; x.font = `900 210px ${D}`; x.fillText('FAR', 80, 280);
    const g = x.createLinearGradient(80, 0, 520, 0);
    ['#a9c8ff', '#7fe3d1', '#ffd166', '#ff8a4c', '#ff3d7f'].forEach((c, i) => g.addColorStop(i / 4, c));
    x.fillStyle = g; x.fillText('OUT', 80, 450);

    x.fillStyle = '#9396b8'; x.font = `700 44px ${B}`; x.fillText(r.title, 84, 560);
    x.fillStyle = '#ece9f5'; x.font = `900 260px ${D}`; x.fillText(r.dist.toLocaleString(), 72, 810);
    const numW = x.measureText(r.dist.toLocaleString()).width;
    x.fillStyle = '#9396b8'; x.font = `700 56px ${B}`; x.fillText('light-years', 90 + numW, 810);

    const cells = r.grid.slice(0, 24), size = 64, gap = 14;
    cells.forEach((c, i) => {
      x.fillStyle = COLORS[c] || COLORS[0];
      const cx = 84 + (i % 12) * (size + gap), cy = 880 + Math.floor(i / 12) * (size + gap);
      x.beginPath(); x.roundRect ? x.roundRect(cx, cy, size, size, 12) : x.rect(cx, cy, size, size); x.fill();
    });
    let y = 880 + Math.ceil(Math.max(1, cells.length) / 12) * (size + gap) + 80;
    if (r.rarest) {
      x.fillStyle = '#9396b8'; x.font = `700 40px ${B}`; x.fillText('Rarest find', 84, y);
      x.fillStyle = COLORS[r.rarest.c]; x.font = `900 92px ${D}`; x.fillText(r.rarest.name.slice(0, 22), 80, y + 96);
      y += 150;
    }
    if (r.extra) { x.fillStyle = '#ffb547'; x.font = `700 44px ${B}`; x.fillText(r.extra, 84, Math.min(y + 20, H - 140)); }
    x.fillStyle = '#9396b8'; x.font = `700 36px ${B}`;
    x.fillText(r.url || 'The game of rare answers', 84, H - 70);
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  }

  /** Share (phones) or save (desktop) the result card. r: {title, dist, grid, rarest:{name,c}, extra, text} */
  FO.ShareCard = {
    draw,
    available: () => !FO.Net.inArtifact && !!document.createElement('canvas').toBlob,
    async share(r) {
      const blob = await draw(r);
      if (!blob) return UI.toast('Could not draw the image');
      const file = new File([blob], 'far-out-result.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text: r.text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'far-out-result.png';
      document.body.append(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      UI.toast('Image saved');
      if (Fx) Fx.sfx.flip();
    },
  };
})();
