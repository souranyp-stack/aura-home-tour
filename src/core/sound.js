// The sound of the place, synthesised rather than recorded, so there is nothing to
// download or license: sea and wind outside, and the fire. Browsers only allow audio
// after a click, so nothing exists until the visitor first asks for sound.

const SAVED = 'aura-sound';
const read = () => { try { return localStorage.getItem(SAVED); } catch { return null; } };
const write = (v) => { try { localStorage.setItem(SAVED, v); } catch { /* private window */ } };

// Fills a looping stereo buffer; each channel has its own noise, so it sounds wide.
function buffer(ctx, seconds, fill) {
  const n = Math.floor(seconds * ctx.sampleRate);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    fill(d, n, ctx.sampleRate, c);
    // crossfade the ends so the loop has no seam
    const fade = Math.floor(ctx.sampleRate * 0.4);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      d[i] = d[i] * t + d[n - fade + i] * (1 - t);
    }
  }
  return b;
}

// Waves: low rumble that surges and drags back, with foam hissing at the top of each
// surge. The swell's period divides the loop exactly, so it joins up cleanly.
function waves(ctx, seconds, swells, gain) {
  return buffer(ctx, seconds, (d, n, rate) => {
    let brown = 0, lp = 0, prev = 0;
    const phase = Math.random() * 6.28;
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      const a = (t / seconds) * swells * 6.28318 + phase;
      const surge = Math.pow(0.5 + 0.5 * Math.sin(a), 2.2);
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.018 * white) / 1.018;
      lp += (white - lp) * 0.11;
      const hiss = white - prev;
      prev = white;
      d[i] = gain * (brown * 3.4 * (0.34 + 0.66 * surge) + lp * 0.5 * (0.1 + 0.55 * surge) + hiss * 0.045 * surge * surge);
    }
  });
}

function wind(ctx) {
  return buffer(ctx, 13, (d, n) => {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099;
      b1 = 0.963 * b1 + w * 0.2965;
      b2 = 0.57 * b2 + w * 1.0527;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
    }
  });
}

// Fire: a low flutter of burning gas, a bed of fine ticks, and now and then a pop.
function fire(ctx) {
  return buffer(ctx, 11, (d, n, rate) => {
    let brown = 0, flutter = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      brown = (brown + 0.026 * w) / 1.026;
      flutter += ((Math.random() * 2 - 1) - flutter) * 0.00035;
      d[i] = brown * 1.5 * (0.72 + flutter * 7);
    }
    const burst = (at, len, amp, tone) => {
      let last = 0;
      for (let k = 0; k < len && at + k < n; k++) {
        const w = Math.random() * 2 - 1;
        last += (w - last) * tone;
        d[at + k] += (w - last) * amp * Math.exp((-k / len) * 6);
      }
    };
    const margin = Math.floor(rate * 0.5);
    for (let i = 0, count = 11 * 26; i < count; i++) burst(margin + Math.floor(Math.random() * (n - 2 * margin)), Math.floor(rate * (0.002 + Math.random() * 0.006)), 0.04 + Math.random() * 0.12, 0.25 + Math.random() * 0.5);
    for (let i = 0, count = 11 * 2; i < count; i++) burst(margin + Math.floor(Math.random() * (n - 2 * margin)), Math.floor(rate * (0.012 + Math.random() * 0.03)), 0.3 + Math.random() * 0.4, 0.08 + Math.random() * 0.2);
  });
}

export function createSound({ onChange = () => {} } = {}) {
  let ctx = null, nodes = null;
  const state = { enabled: false, outside: true, fire: true };

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 6;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(limiter);
    limiter.connect(analyser);
    analyser.connect(ctx.destination);

    const loop = (buf, dest, gain = 1) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      const g = ctx.createGain();
      g.gain.value = gain;
      s.connect(g);
      g.connect(dest);
      s.start();
      return g;
    };

    // outside: two swells that drift against each other, so it never repeats; and
    // wind, with a slow hand on its filter. Walls and glass are a lowpass.
    const outsideGain = ctx.createGain();
    outsideGain.gain.value = 0;
    const outsideMuffle = ctx.createBiquadFilter();
    outsideMuffle.type = 'lowpass';
    outsideMuffle.frequency.value = 9000;
    outsideGain.connect(outsideMuffle);
    outsideMuffle.connect(master);
    loop(waves(ctx, 17, 2, 0.8), outsideGain);
    loop(waves(ctx, 23, 3, 0.55), outsideGain);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 520;
    band.Q.value = 0.7;
    band.connect(outsideGain);
    loop(wind(ctx), band, 0.42);
    for (const [hz, depth] of [[0.07, 170], [0.023, 120]]) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = hz;
      const d = ctx.createGain();
      d.gain.value = depth;
      lfo.connect(d);
      d.connect(band.frequency);
      lfo.start();
    }

    const fireGain = ctx.createGain();
    fireGain.gain.value = 0;
    const fireMuffle = ctx.createBiquadFilter();
    fireMuffle.type = 'lowpass';
    fireMuffle.frequency.value = 12000;
    const firePan = ctx.createStereoPanner();
    fireGain.connect(fireMuffle);
    fireMuffle.connect(firePan);
    firePan.connect(master);
    loop(fire(ctx), fireGain, 0.95);

    nodes = { master, analyser, outsideGain, outsideMuffle, fireGain, fireMuffle, firePan };
  }

  const glide = (param, value, time = 0.25) => { param.setTargetAtTime(value, ctx.currentTime, time); };

  function apply() {
    if (!ctx) return;
    if (state.enabled) ctx.resume();
    glide(nodes.master.gain, state.enabled ? 0.9 : 0, 0.18);
    onChange(state);
  }

  // called only from a click, so the browser allows the audio to begin
  function setEnabled(on, remember = true) {
    state.enabled = on;
    if (remember) write(on ? 'on' : 'off');
    if (on && !ctx) build();
    apply();
    if (!ctx) onChange(state);
  }

  function toggleChannel(name) {
    const turningOn = !state[name] || !state.enabled;
    state[name] = turningOn;
    if (turningOn && !state.enabled) setEnabled(true);
    else onChange(state);
  }

  // How loud each thing is where the listener is standing, called every frame.
  function mix({ outside = 0, muffle = 0, fire: f = 0, fireMuffle = 0, pan = 0 }) {
    if (!ctx || !state.enabled) return;
    glide(nodes.outsideGain.gain, state.outside ? outside : 0);
    glide(nodes.outsideMuffle.frequency, 9000 * Math.pow(420 / 9000, muffle), 0.3);
    glide(nodes.fireGain.gain, state.fire ? f : 0);
    glide(nodes.fireMuffle.frequency, 12000 * Math.pow(600 / 12000, fireMuffle), 0.3);
    glide(nodes.firePan.pan, pan, 0.2);
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (state.enabled) ctx.resume();
  });

  // for tests: how loud the output is right now, as RMS
  function level() {
    if (!nodes) return 0;
    const a = new Float32Array(nodes.analyser.fftSize);
    nodes.analyser.getFloatTimeDomainData(a);
    return Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
  }

  return {
    state, setEnabled, toggleChannel, mix, level,
    toggle: () => setEnabled(!state.enabled),
    // entering the walk is itself a click, so sound can start, unless they turned it off
    startIfWelcome: () => { if (read() !== 'off' && !state.enabled) setEnabled(true, false); },
  };
}
