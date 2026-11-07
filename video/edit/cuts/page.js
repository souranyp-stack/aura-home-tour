// One sponsor take as a plain page recording for another editor (Fil): the
// take at its own 2880x1800, with nothing on it but the fix for Chrome's
// whole-pixel scrolling (the page moved by each frame's logged remainder) and,
// for a slowed take, neighbouring frames blended. No window, zoom or finish.
// ?take=<clip>&take-from=<s>&take-speed=<x>&take-dur=<s>
window.CUTS = window.CUTS || {};
window.CUTS.page = (api) => {
  const { add, stage } = api;
  const q = new URLSearchParams(location.search);
  const src = q.get('take'), from = +(q.get('take-from') || 0), speed = +(q.get('take-speed') || 1);
  const info = (window.__takes || {})[src] || { seconds: 1, resid: [] };
  const dur = q.get('take-dur') ? +q.get('take-dur') : (info.seconds - from) / speed;
  const W = 2880, H = 1800;
  for (const el of [document.documentElement, document.body, stage]) { el.style.width = `${W}px`; el.style.height = `${H}px`; }
  const shot = add({ at: 0, dur: 9999, html: `<canvas width="${W}" height="${H}" style="position:absolute;inset:0;width:${W}px;height:${H}px"></canvas>` });
  const g = shot.el.firstChild.getContext('2d');
  const L = add({ src, type: 'paint', paint: true, blend: speed < 1, at: 0, dur: dur + 1, from, speed });
  return {
    duration: dur,
    plain: true,
    size: [W, H],
    frame() {
      if (!L.video || L.st === undefined) return;
      const fr = Math.max(0, L.st * 60), k0 = Math.floor(fr), res = info.resid || [];
      const r = (res[Math.min(res.length - 1, k0)] || 0) * (1 - (L.mix || 0)) + (res[Math.min(res.length - 1, k0 + 1)] || 0) * (L.mix || 0);
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      g.imageSmoothingEnabled = true;
      g.globalAlpha = 1;
      g.drawImage(L.video, 0, r * 2);
      if (L.blend && L.mix > 0.002) { g.globalAlpha = L.mix; g.drawImage(L.video2, 0, r * 2); g.globalAlpha = 1; }
    },
  };
};
