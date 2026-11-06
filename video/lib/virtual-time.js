// Injected before any page script. Until __vt.enable() the page runs in real
// time; after it, time only moves when the recorder calls __vt.step(ms), so
// every frame is rendered exactly once, however long it takes to draw.
// Covers performance.now, Date.now, requestAnimationFrame, timers and the
// page's CSS transitions and animations (through the Web Animations API).
(() => {
  const realPerf = performance.now.bind(performance);
  const realDate = Date.now.bind(Date);
  const realRAF = window.requestAnimationFrame.bind(window);
  const realCAF = window.cancelAnimationFrame.bind(window);
  const realST = window.setTimeout.bind(window);
  const realCT = window.clearTimeout.bind(window);
  const realSI = window.setInterval.bind(window);
  const realCI = window.clearInterval.bind(window);

  let on = false;
  let now = 0;        // virtual performance.now(), ms
  let dateBase = 0;   // Date.now() at virtual 0
  let seq = 1e6;
  let frames = [];    // [id, cb]
  const timers = new Map(); // id -> {due, cb, args, every}
  const nativeIds = new Map(); // our id -> native id while real

  performance.now = () => (on ? now : realPerf());
  Date.now = () => (on ? dateBase + now : realDate());

  window.requestAnimationFrame = (cb) => {
    const id = ++seq;
    if (on) frames.push([id, cb]);
    else nativeIds.set(id, realRAF((t) => { nativeIds.delete(id); cb(on ? now : t); }));
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    frames = frames.filter((f) => f[0] !== id);
    if (nativeIds.has(id)) { realCAF(nativeIds.get(id)); nativeIds.delete(id); }
  };

  const addTimer = (cb, ms, args, every) => {
    const id = ++seq;
    const delay = Math.max(0, +ms || 0);
    if (on) timers.set(id, { due: now + delay, cb, args, every: every ? Math.max(1, delay) : 0 });
    else {
      const fire = () => { if (typeof cb === 'function') cb(...args); };
      nativeIds.set(id, every ? realSI(fire, delay) : realST(() => { nativeIds.delete(id); fire(); }, delay));
    }
    return id;
  };
  const clearTimer = (id) => {
    timers.delete(id);
    if (nativeIds.has(id)) { realCT(nativeIds.get(id)); realCI(nativeIds.get(id)); nativeIds.delete(id); }
  };
  window.setTimeout = (cb, ms, ...args) => addTimer(cb, ms, args, false);
  window.setInterval = (cb, ms, ...args) => addTimer(cb, ms, args, true);
  window.clearTimeout = clearTimer;
  window.clearInterval = clearTimer;
  window.requestIdleCallback = (cb) => addTimer(() => cb({ didTimeout: false, timeRemaining: () => 12 }), 1, [], false);
  window.cancelIdleCallback = clearTimer;

  // CSS transitions and animations: hold each one and set its clock by hand
  const started = new WeakMap();
  const syncAnimations = (frameMs) => {
    for (const a of document.getAnimations()) {
      if (!started.has(a)) {
        started.set(a, now - Math.min(a.currentTime ?? 0, frameMs));
        a.pause();
      }
      const t = now - started.get(a);
      const end = a.effect?.getComputedTiming?.().endTime;
      if (Number.isFinite(end) && t >= end) { try { a.finish(); } catch { /* already gone */ } }
      else a.currentTime = t;
    }
  };

  window.__vt = {
    enable() {
      if (on) return;
      now = realPerf();
      dateBase = realDate() - now;
      on = true;
    },
    get on() { return on; },
    get now() { return now; },
    step(ms) {
      const end = now + ms;
      // timers fire in order, each at its own due time
      for (let guard = 0; guard < 10000; guard++) {
        let next = null;
        for (const [id, t] of timers) if (t.due <= end && (!next || t.due < next[1].due)) next = [id, t];
        if (!next) break;
        const [id, t] = next;
        now = Math.max(now, t.due);
        if (t.every) t.due += t.every; else timers.delete(id);
        try { if (typeof t.cb === 'function') t.cb(...(t.args || [])); } catch (e) { console.error(e); }
      }
      now = end;
      const run = frames;
      frames = [];
      for (const [, cb] of run) { try { cb(now); } catch (e) { console.error(e); } }
      syncAnimations(ms);
    },
  };
})();
