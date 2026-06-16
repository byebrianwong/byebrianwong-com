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
  rip() { noise({ dur: 0.28, vol: 0.28, hp: 500 }); tone({ freq: 300, slideTo: 90, type: "sawtooth", dur: 0.25, vol: 0.12 }); },
  whoosh() { tone({ freq: 180, slideTo: 620, type: "sawtooth", dur: 0.16, vol: 0.12 }); },
  blip() { tone({ freq: 600, dur: 0.05, vol: 0.12 }); },
  flip() { tone({ freq: 320, slideTo: 520, dur: 0.07, vol: 0.12 }); },
  fire() { tone({ freq: 140, slideTo: 40, type: "sawtooth", dur: 0.3, vol: 0.16 }); noise({ dur: 0.3, vol: 0.08, hp: 1200 }); },
  rare() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, dur: 0.14, vol: 0.2, delay: i * 0.1 })); },
  select() { tone({ freq: 440, dur: 0.06, vol: 0.15 }); tone({ freq: 660, dur: 0.1, vol: 0.15, delay: 0.05 }); },
  toggle() { on = !on; if (on) Sound.blip(); return on; },
  get isOn() { return on; },
};
