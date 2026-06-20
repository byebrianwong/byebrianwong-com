// Synthesized arcade SFX via the Web Audio API — zero asset files.
// Only touches `window` inside functions, so it's safe to import during SSR.

let ctx: AudioContext | null = null;
let on = true;

function ac(): AudioContext {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq?: number;
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  slideTo?: number;
  delay?: number;
}

function tone({ freq = 440, type = "square", dur = 0.12, vol = 0.18, slideTo, delay = 0 }: ToneOpts) {
  if (!on) return;
  const c = ac();
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noise({ dur = 0.2, vol = 0.2, delay = 0, hp = 700 }: { dur?: number; vol?: number; delay?: number; hp?: number }) {
  if (!on) return;
  const c = ac();
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
}

// A long, organic tear: a dense run of short noise crackles that travels and
// builds across `total`, getting fuller as the highpass drops, over a low body.
// Slight per-tick jitter means every rip sounds a little different.
function tear({ total, count, hpStart, hpEnd, peak, jitter = 0.01, bodyFreq, bodyVol = 0.05 }: {
  total: number; count: number; hpStart: number; hpEnd: number; peak: number;
  jitter?: number; bodyFreq?: number; bodyVol?: number;
}) {
  if (!on) return;
  for (let i = 0; i < count; i++) {
    const p = count === 1 ? 0 : i / (count - 1); // 0..1 progress across the tear
    const delay = Math.max(0, p * total + (Math.random() - 0.5) * jitter);
    const vol = Math.max(0.01, peak * (0.25 + 0.75 * p) * (0.6 + Math.random() * 0.7));
    const hp = Math.max(120, hpStart + (hpEnd - hpStart) * p + (Math.random() - 0.5) * 400);
    noise({ dur: 0.05, vol, hp, delay });
  }
  if (bodyFreq) tone({ freq: bodyFreq, slideTo: bodyFreq * 0.4, type: "sawtooth", dur: total, vol: bodyVol });
}

export const Sound = {
  coin() {
    // rising chime while the coin falls...
    tone({ freq: 988, dur: 0.07, vol: 0.2 });
    tone({ freq: 1319, dur: 0.12, vol: 0.2, delay: 0.07 });
    // ...then a clunk + "ka-ching" timed to it sliding into the slot (~0.86s)
    tone({ freq: 200, slideTo: 70, type: "sawtooth", dur: 0.12, vol: 0.16, delay: 0.8 });
    noise({ dur: 0.05, vol: 0.12, hp: 2200, delay: 0.8 });
    tone({ freq: 1568, dur: 0.09, vol: 0.16, delay: 0.86 });
    tone({ freq: 2093, dur: 0.16, vol: 0.16, delay: 0.94 });
  },
  rip() { tear({ total: 0.5, count: 26, hpStart: 3600, hpEnd: 1500, peak: 0.14, jitter: 0.008, bodyFreq: 300, bodyVol: 0.04 }); },
  whoosh() { tone({ freq: 180, slideTo: 620, type: "sawtooth", dur: 0.16, vol: 0.12 }); },
  blip() { tone({ freq: 600, dur: 0.05, vol: 0.12 }); },
  flip() { tone({ freq: 320, slideTo: 520, dur: 0.07, vol: 0.12 }); },
  fire() { tone({ freq: 784, type: "triangle", dur: 0.06, vol: 0.06 }); tone({ freq: 1175, type: "triangle", dur: 0.07, vol: 0.04, delay: 0.018 }); },
  rare() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, dur: 0.14, vol: 0.2, delay: i * 0.1 })); },
  select() { tone({ freq: 440, dur: 0.06, vol: 0.15 }); tone({ freq: 660, dur: 0.1, vol: 0.15, delay: 0.05 }); },
  toggle() { on = !on; if (on) Sound.blip(); return on; },
  get isOn() { return on; },
};
