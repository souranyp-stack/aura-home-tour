// Motion helpers available to every shot's page-side frame function as E.
(() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    clamp, lerp,
    // eases: in-out sine is the gentlest, quint the most "designed"
    linear: (t) => clamp(t),
    sine: (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2,
    cubic: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    quint: (t) => { t = clamp(t); return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; },
    outCubic: (t) => 1 - Math.pow(1 - clamp(t), 3),
    inCubic: (t) => clamp(t) ** 3,
    // remap a sub-range of t to 0..1
    span: (t, a, b) => clamp((t - a) / (b - a)),
    v: (a, b, t) => a.map((x, i) => lerp(x, b[i], t)),
    // centripetal-free Catmull-Rom through points, t in 0..1 over the whole path
    path(pts, t) {
      t = clamp(t);
      const seg = pts.length - 1, f = t * seg, i = Math.min(seg - 1, Math.floor(f)), u = f - i;
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(seg, i + 2)];
      return p1.map((_, k) => {
        const a = p0[k], b = p1[k], c = p2[k], d = p3[k];
        return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
      });
    },
  };
  window.E = E;
})();
