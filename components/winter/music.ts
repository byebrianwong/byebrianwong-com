// Quiet Christmas music for the winter village, synthesized with the Web Audio
// API (no audio files, like the arcade's sound effects in lib/sound.ts).
//
// A music box plays public-domain carols slowly over a soft pad, in a little
// reverb, with a short interlude of drifting bell notes between them, and
// then goes round again. Browsers only allow sound after the visitor has
// clicked or pressed a key, so the page calls `start()` from that gesture.
// Only touches `window` inside methods, so it's safe to import during SSR.

/* ---------------- the carols ---------------- */

/**
 * A carol, written as "note:length" tokens. Lengths are in eighth notes,
 * "R" is a rest, and "|" marks the bar lines (for reading; they're ignored).
 * Chords use the same lengths; "N" is no chord.
 */
export interface Carol {
  title: string;
  /** Eighth notes per minute. */
  tempo: number;
  /** Eighth notes per bar, to check the bars add up. */
  bar: number;
  melody: string;
  chords: string;
  /** Faint sleigh bells on the off beats. */
  jingle?: boolean;
}

const WISH_A = "G4:2 G4:1 A4:1 G4:1 F#4:1 | E4:2 E4:2 E4:2 | A4:2 A4:1 B4:1 A4:1 G4:1 | F#4:2 D4:2 D4:2 | B4:2 B4:1 C5:1 B4:1 A4:1 | G4:2 E4:2 D4:1 D4:1 | E4:2 A4:2 F#4:2";
const WISH_CHORDS = "G:6 | C:6 | A7:6 | D:6 | B7:6 | Em:6 | C:2 D:4 | G:6";

export const CAROLS: Carol[] = [
  {
    title: "Silent Night",
    tempo: 118,
    bar: 6,
    melody:
      "G4:3 A4:1 G4:2 | E4:6 | G4:3 A4:1 G4:2 | E4:6 | D5:4 D5:2 | B4:6 | C5:4 C5:2 | G4:6 | " +
      "A4:4 A4:2 | C5:3 B4:1 A4:2 | G4:3 A4:1 G4:2 | E4:6 | A4:4 A4:2 | C5:3 B4:1 A4:2 | G4:3 A4:1 G4:2 | E4:6 | " +
      "D5:4 D5:2 | F5:3 D5:1 B4:2 | C5:6 | E5:6 | C5:3 G4:1 E4:2 | G4:3 F4:1 D4:2 | C4:6 | R:6",
    chords:
      "C:6 | C:6 | C:6 | C:6 | G:6 | G:6 | C:6 | C:6 | F:6 | F:6 | C:6 | C:6 | F:6 | F:6 | C:6 | C:6 | " +
      "G7:6 | G7:6 | C:6 | C:6 | C:6 | G7:6 | C:6 | C:6",
  },
  {
    title: "Jingle Bells",
    tempo: 184,
    bar: 8,
    jingle: true,
    melody:
      "E4:2 E4:2 E4:4 | E4:2 E4:2 E4:4 | E4:2 G4:2 C4:3 D4:1 | E4:8 | F4:2 F4:2 F4:3 F4:1 | F4:2 E4:2 E4:2 E4:1 E4:1 | E4:2 D4:2 D4:2 E4:2 | D4:4 G4:4 | " +
      "E4:2 E4:2 E4:4 | E4:2 E4:2 E4:4 | E4:2 G4:2 C4:3 D4:1 | E4:8 | F4:2 F4:2 F4:3 F4:1 | F4:2 E4:2 E4:2 E4:1 E4:1 | G4:2 G4:2 F4:2 D4:2 | C4:8",
    chords: "C:8 | C:8 | C:8 | C:8 | F:8 | C:8 | D7:8 | G:8 | C:8 | C:8 | C:8 | C:8 | F:8 | C:8 | G7:8 | C:8",
  },
  {
    title: "Deck the Halls",
    tempo: 176,
    bar: 8,
    melody:
      "G4:3 F4:1 E4:2 D4:2 | C4:2 D4:2 E4:2 C4:2 | D4:1 E4:1 F4:1 D4:1 E4:3 D4:1 | C4:2 B3:2 C4:4 | " +
      "G4:3 F4:1 E4:2 D4:2 | C4:2 D4:2 E4:2 C4:2 | D4:1 E4:1 F4:1 D4:1 E4:3 D4:1 | C4:2 B3:2 C4:4 | " +
      "D4:3 E4:1 F4:2 D4:2 | E4:3 F4:1 G4:2 D4:2 | E4:1 F#4:1 G4:2 A4:1 B4:1 C5:2 | B4:2 A4:2 G4:4 | " +
      "G4:3 F4:1 E4:2 D4:2 | C4:2 D4:2 E4:2 C4:2 | A4:1 A4:1 A4:1 A4:1 G4:3 F4:1 | E4:2 D4:2 C4:4",
    chords:
      "C:8 | C:8 | G:4 C:4 | G:4 C:4 | C:8 | C:8 | G:4 C:4 | G:4 C:4 | " +
      "G:8 | C:4 G:4 | C:4 D:4 | G:8 | C:8 | C:8 | F:4 C:4 | G:4 C:4",
  },
  {
    title: "We Wish You a Merry Christmas",
    tempo: 216,
    bar: 6,
    // Twice through; the first time ends on the pickup into the second.
    melody: `D4:2 | ${WISH_A} | G4:4 D4:2 | ${WISH_A} | G4:6`,
    chords: `N:2 | ${WISH_CHORDS} | ${WISH_CHORDS}`,
  },
];

/* ---------------- notes and chords ---------------- */

const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "F#4" → MIDI 66. */
export function midi(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`Not a note: ${name}`);
  return 12 * (Number(m[3]) + 1) + PITCH[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** The notes of a chord symbol (C, Em, G7, A7, Fmaj7...), voiced low and open for the pad. */
export function chordNotes(sym: string): number[] {
  const m = /^([A-G])(#|b)?(maj7|m7|m|7)?$/.exec(sym);
  if (!m) throw new Error(`Not a chord: ${sym}`);
  const root = 48 + ((PITCH[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12);
  const q = m[3] ?? "";
  const third = q.startsWith("m") && q !== "maj7" ? 3 : 4;
  const notes = [root, root + 7, root + 12 + third];
  if (q === "7" || q === "m7") notes.push(root + 12 + 10);
  if (q === "maj7") notes.push(root + 12 + 11);
  return notes;
}

export interface Step {
  /** Start, in eighth notes from the top. */
  at: number;
  /** Note or chord name, or null for a rest. */
  name: string | null;
  len: number;
}

/** Read a "note:length | ..." line into timed steps. */
export function parse(line: string): Step[] {
  const out: Step[] = [];
  let at = 0;
  for (const tok of line.split(/\s+/)) {
    if (!tok || tok === "|") continue;
    const [name, len] = tok.split(":");
    const n = Number(len);
    if (!n) throw new Error(`Bad step: ${tok}`);
    out.push({ at, name: name === "R" || name === "N" ? null : name, len: n });
    at += n;
  }
  return out;
}

/** Bar lengths of a line, for checking a carol adds up. */
export const barLengths = (line: string) =>
  line.split("|").map((b) => b.trim().split(/\s+/).filter(Boolean).reduce((s, t) => s + Number(t.split(":")[1]), 0));

/* ---------------- instruments ---------------- */

/** One music-box note: a bright pluck that rings out and fades, whatever its written length. */
function musicBox(ctx: BaseAudioContext, out: AudioNode, t: number, f: number, vel: number) {
  const partials: [number, number, number][] = [
    // [frequency ratio, level, ring time in seconds]
    [1, 1, 2.4],
    [3.01, 0.22, 0.7],
    [5.43, 0.07, 0.25],
  ];
  for (const [ratio, level, ring] of partials) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = f * ratio;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13 * vel * level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + ring + 0.05);
  }
}

/** A soft, slightly detuned pad holding a chord underneath. */
function pad(ctx: BaseAudioContext, out: AudioNode, t: number, notes: number[], dur: number) {
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const g = ctx.createGain();
  const end = t + dur;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.016, t + Math.min(0.8, dur / 2));
  g.gain.setValueAtTime(0.016, Math.max(t + Math.min(0.8, dur / 2), end - 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, end + 1.4);
  lp.connect(g).connect(out);
  for (const n of notes) {
    for (const cents of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = hz(n);
      o.detune.value = cents;
      o.connect(lp);
      o.start(t);
      o.stop(end + 1.5);
    }
  }
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext) {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, b);
  }
  return b;
}

/** A faint shake of sleigh bells. */
function jingle(ctx: BaseAudioContext, out: AudioNode, t: number) {
  for (const dt of [0, 0.03, 0.055]) {
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(ctx);
    bp.type = "bandpass";
    bp.frequency.value = 6800;
    bp.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t + dt);
    g.gain.exponentialRampToValueAtTime(0.05, t + dt + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.14);
    s.connect(bp).connect(g).connect(out);
    s.start(t + dt);
    s.stop(t + dt + 0.2);
  }
}

/* ---------------- arranging ---------------- */

/** Schedule a whole carol from time `t0`. Returns when it ends. */
export function playCarol(ctx: BaseAudioContext, out: AudioNode, c: Carol, t0: number): number {
  const sec = 60 / c.tempo;
  const melody = parse(c.melody);
  for (const s of melody) {
    if (!s.name) continue;
    // The music box plays an octave up; notes on a beat ring a touch louder.
    musicBox(ctx, out, t0 + s.at * sec, hz(midi(s.name) + 12), s.at % 2 === 0 ? 1 : 0.8);
  }
  // Hold each chord until it changes, instead of re-striking it every bar.
  const chords = parse(c.chords);
  for (let i = 0; i < chords.length; i++) {
    const s = chords[i];
    if (!s.name) continue;
    let len = s.len;
    while (i + 1 < chords.length && chords[i + 1].name === s.name) len += chords[++i].len;
    pad(ctx, out, t0 + s.at * sec, chordNotes(s.name), len * sec);
  }
  const total = melody.reduce((sum, s) => sum + s.len, 0);
  if (c.jingle) for (let at = 2; at < total; at += 4) jingle(ctx, out, t0 + at * sec);
  return t0 + total * sec;
}

/** Between carols: a held chord with a few bell notes drifting down like snow. */
export function playInterlude(ctx: BaseAudioContext, out: AudioNode, t0: number, seed: number): number {
  const dur = 7;
  pad(ctx, out, t0, chordNotes(seed % 2 ? "Fmaj7" : "C"), dur - 1.5);
  const bells = ["G5", "A5", "C6", "D6", "E6", "G6"];
  let r = seed * 9301 + 49297;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 5; i++) musicBox(ctx, out, t0 + 0.6 + i * 1.1 + rand() * 0.4, hz(midi(bells[Math.floor(rand() * bells.length)])), 0.55);
  return t0 + dur;
}

/** Play piece number `n` of the never-ending set list (carol, interlude, carol, ...). Returns when it ends. */
export function playPiece(ctx: BaseAudioContext, out: AudioNode, n: number, t0: number): number {
  return n % 2 === 0 ? playCarol(ctx, out, CAROLS[(n / 2) % CAROLS.length], t0) : playInterlude(ctx, out, t0, n);
}

/** How loud the music plays: quiet, behind everything else. */
export const VOLUME = 0.55;

/** The shared output: a little reverb, a gentle limiter, and a master volume that fades. */
export function makeOutput(ctx: BaseAudioContext) {
  const input = ctx.createGain();
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 2.6), ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-8 * i) / d.length);
  }
  const verb = ctx.createConvolver();
  verb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 5200;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -20;
  limit.ratio.value = 4;
  input.connect(dry).connect(master);
  input.connect(verb).connect(wet).connect(master);
  master.connect(soften).connect(limit).connect(ctx.destination);
  return { input, master };
}

/* ---------------- the player ---------------- */

const PREF_KEY = "byebrianwong:music";

/** Whether this visitor wants music (yes, unless they turned it off). */
export function musicWanted(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}
export function setMusicWanted(on: boolean) {
  try {
    window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    /* storage blocked: it just won't be remembered */
  }
}

/** Plays the set list on a loop. `start()` must be called from a click or key press. */
export class WinterMusic {
  private ctx: AudioContext | null = null;
  private out: ReturnType<typeof makeOutput> | null = null;
  private timer = 0;
  private next = 0;
  private piece = 0;
  private playing = false;

  get isPlaying() {
    return this.playing;
  }

  start() {
    if (this.playing) return;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.out = makeOutput(this.ctx);
      this.next = this.ctx.currentTime + 0.4;
      this.timer = window.setInterval(this.tick, 500);
      document.addEventListener("visibilitychange", this.onVisibility);
    }
    void this.ctx.resume();
    this.fadeTo(VOLUME, 3);
    this.playing = true;
    this.tick();
  }

  stop() {
    if (!this.ctx || !this.playing) return;
    this.playing = false;
    this.fadeTo(0.0001, 0.6);
    const ctx = this.ctx;
    window.setTimeout(() => { if (!this.playing && ctx.state === "running") void ctx.suspend(); }, 700);
  }

  dispose() {
    window.clearInterval(this.timer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    void this.ctx?.close();
    this.ctx = null;
    this.out = null;
    this.playing = false;
  }

  private fadeTo(v: number, seconds: number) {
    if (!this.ctx || !this.out) return;
    const g = this.out.master.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(v, now + seconds);
  }

  /** Keep a few seconds of music scheduled ahead. */
  private tick = () => {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.playing || ctx.state !== "running") return;
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.2;
    while (this.next < ctx.currentTime + 4) this.next = playPiece(ctx, this.out.input, this.piece++, this.next);
  };

  /** A hidden tab goes quiet, and picks up where it left off when it's back. */
  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else if (this.playing) void this.ctx.resume();
  };
}
