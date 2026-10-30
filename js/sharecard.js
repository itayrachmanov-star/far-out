/* Far Out — result card image (1080×1350) for sharing to chats and stories. */
(function () {
  'use strict';
  const FO = window.FarOut, UI = FO.UI, Fx = FO.Fx;
  const W = 1080, H = 1350;
  const COLORS = { 1: '#ffcb45', 2: '#a98dff', 3: '#ff7a5c', 4: '#52e0b4', 5: '#a9b5dc', 0: '#30337f' };
  const SKY = '#1b1c4e', FG = '#fbf8ff', MUTED = '#b1b3e6';

  /** Largest font size (from max) at which text fits in width. */
  function fit(x, text, weight, family, max, width) {
    let size = max;
    do { x.font = `${weight} ${size}px ${family}`; size -= 6; } while (x.measureText(text).width > width && size > 40);
    return size + 6;
  }

  async function draw(r) {
    try { await document.fonts.ready; } catch (e) { /* fall back to system fonts */ }
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = SKY; x.fillRect(0, 0, W, H);
    const rng = FO.rng(r.title + r.dist);
    for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(251,248,255,${0.15 + rng() * 0.6})`; x.beginPath(); x.arc(rng() * W, rng() * H, rng() * 2.2 + 0.4, 0, 6.283); x.fill(); }
    // the ringed planet from the hub, top right
    x.fillStyle = COLORS[3]; x.beginPath(); x.arc(W - 200, 210, 110, 0, 6.283); x.fill();
    x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.arc(W - 186, 224, 110, 0, 6.283); x.arc(W - 200, 210, 110, 0, 6.283, true); x.fill('evenodd');
    x.save(); x.translate(W - 200, 220); x.rotate(-0.25); x.strokeStyle = COLORS[1]; x.lineWidth = 16;
    x.beginPath(); x.ellipse(0, 0, 175, 40, 0, 0.15, Math.PI - 0.15); x.stroke(); x.restore();

    const D = '"Unbounded", "Arial Black", sans-serif', B = '"Gabarito", system-ui, sans-serif';
    x.textBaseline = 'alphabetic';
    x.fillStyle = FG; x.font = `900 92px ${D}`; x.fillText('Far Out', 80, 200);
    x.fillStyle = MUTED; x.font = `700 46px ${B}`; x.fillText(r.title, 84, 470);
    const num = r.dist.toLocaleString();
    fit(x, num, 900, D, 230, 760);
    x.fillStyle = FG; x.fillText(num, 76, 700);
    const numW = x.measureText(num).width;
    x.fillStyle = MUTED; x.font = `700 52px ${B}`; x.fillText(r.unit || 'ly', 100 + numW, 700);

    const cells = r.grid.slice(0, 24), size = 64, gap = 14;
    cells.forEach((c, i) => {
      x.fillStyle = COLORS[c] || COLORS[0];
      const cx = 84 + (i % 12) * (size + gap), cy = 790 + Math.floor(i / 12) * (size + gap);
      x.beginPath(); x.roundRect ? x.roundRect(cx, cy, size, size, 12) : x.rect(cx, cy, size, size); x.fill();
    });
    let y = 790 + Math.ceil(Math.max(1, cells.length) / 12) * (size + gap) + 80;
    if (r.rarest) {
      x.fillStyle = MUTED; x.font = `700 42px ${B}`; x.fillText('Rarest find', 84, y);
      x.fillStyle = COLORS[r.rarest.c]; fit(x, r.rarest.name, 800, B, 104, W - 170); x.fillText(r.rarest.name, 80, y + 100);
      y += 150;
    }
    if (r.extra) { x.fillStyle = COLORS[1]; x.font = `700 44px ${B}`; x.fillText(r.extra, 84, Math.min(y + 20, H - 140)); }
    x.fillStyle = MUTED; x.font = `700 36px ${B}`;
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
