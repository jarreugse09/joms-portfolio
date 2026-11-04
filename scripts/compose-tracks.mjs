// Renders the portfolio's original chiptune tracks to public/audio/*.wav.
// Written for this site; released under CC0. Run: node scripts/compose-tracks.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 22050;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const n = (s) => { // "A4", "C#5", "Bb3"
  const m = /^([A-G])([#b]?)(\d)$/.exec(s);
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
};

function render({ bpm, bars, chords, melody, swing = 0, leadDuty = 0.25, hat = true, mood = 1 }) {
  const beat = 60 / bpm, bar = beat * 4;
  const len = Math.ceil(bars * bar * SR) + SR * 2;
  const out = new Float32Array(len);
  const add = (t0, dur, f, wave, vol, opts = {}) => {
    const s0 = Math.floor(t0 * SR), ns = Math.floor(dur * SR);
    let ph = 0;
    const a = opts.a ?? 0.005, r = opts.r ?? 0.08;
    for (let i = 0; i < ns + r * SR && s0 + i < len; i++) {
      const t = i / SR;
      const env = t < a ? t / a : t < dur ? 1 - (opts.decay ?? 0) * (t / dur) : Math.max(0, 1 - (t - dur) / r) * (1 - (opts.decay ?? 0));
      const vib = opts.vib ? 1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t * 3) : 1;
      const freq = (opts.sweep ? f * Math.exp(-t * opts.sweep) + 40 : f) * vib;
      ph += freq / SR; ph -= Math.floor(ph);
      let v;
      if (wave === "pulse") v = ph < (opts.duty ?? 0.5) ? 1 : -1;
      else if (wave === "tri") v = 4 * Math.abs(ph - 0.5) - 1;
      else if (wave === "sine") v = Math.sin(2 * Math.PI * ph);
      else v = Math.random() * 2 - 1;
      out[s0 + i] += v * env * vol;
    }
  };
  for (let b = 0; b < bars; b++) {
    const t = b * bar;
    const ch = chords[b % chords.length].map(n);
    // bass: root on 1 and 3, fifth pickup
    add(t, beat * 1.5, midi(ch[0] - 12), "tri", 0.32, { r: 0.05 });
    add(t + beat * 2, beat * 1.0, midi(ch[0] - 12), "tri", 0.3, { r: 0.05 });
    add(t + beat * 3.5, beat * 0.5, midi(ch[2] - 12), "tri", 0.26, { r: 0.04 });
    // arpeggio
    for (let k = 0; k < 8; k++) {
      const sw = k % 2 ? swing * beat * 0.5 : 0;
      const note = ch[[0, 1, 2, 1, 0, 2, 1, 2][k]] + (k >= 4 ? 12 : 0);
      add(t + k * beat * 0.5 + sw, beat * 0.32, midi(note), "pulse", 0.07 * mood, { duty: 0.125, r: 0.06, decay: 0.5 });
    }
    // drums
    for (let q = 0; q < 4; q++) {
      const tq = t + q * beat;
      if (q === 0 || q === 2) add(tq, 0.12, 140, "sine", 0.55, { sweep: 28, r: 0.04 });
      if (q === 1 || q === 3) add(tq, 0.09, 0, "noise", 0.16, { r: 0.06, decay: 0.8 });
      if (hat) { add(tq + beat * 0.5 + swing * beat * 0.5, 0.025, 0, "noise", 0.05, { r: 0.015 }); add(tq, 0.02, 0, "noise", 0.035, { r: 0.01 }); }
    }
  }
  // melody: [noteName|null, beats]
  let tm = 0;
  const loopLen = melody.reduce((s, m) => s + m[1], 0);
  const reps = Math.floor((bars * 4) / loopLen);
  for (let r = 0; r < reps; r++) for (const [nm, bt] of melody) {
    if (nm) {
      const f = midi(n(nm) + (r % 2 === 1 && r === reps - 1 ? 0 : 0));
      add(tm * beat, bt * beat * 0.9, f, "pulse", 0.11, { duty: leadDuty, vib: true, r: 0.12, decay: 0.25 });
      add(tm * beat + beat * 0.75, bt * beat * 0.9, f, "pulse", 0.035, { duty: leadDuty, r: 0.12, decay: 0.4 }); // echo
    }
    tm += bt;
  }
  // one-pole lowpass + soft clip + fades
  let y = 0; const k = 0.55;
  const fadeIn = SR * 0.4, total = Math.floor(bars * bar * SR) + SR, fadeOut = SR * 2.5;
  for (let i = 0; i < len; i++) {
    y += k * (out[i] - y);
    let v = Math.tanh(y * 1.1) * 0.9;
    if (i < fadeIn) v *= i / fadeIn;
    if (i > total - fadeOut) v *= Math.max(0, (total - i) / fadeOut);
    out[i] = v;
  }
  return out.subarray(0, total);
}

function wav(samples) { // 8-bit unsigned PCM mono keeps files small; chiptune survives it fine
  const buf = Buffer.alloc(44 + samples.length);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length, 40);
  for (let i = 0; i < samples.length; i++) buf[44 + i] = Math.max(0, Math.min(255, Math.round(128 + samples[i] * 127 + (Math.random() - 0.5))));
  return buf;
}

const tracks = {
  "harbor-lights": render({
    bpm: 96, bars: 28, swing: 0.15,
    chords: [["A3","C4","E4"],["F3","A3","C4"],["C4","E4","G4"],["G3","B3","D4"]],
    melody: [["E5",1],["D5",0.5],["C5",0.5],["A4",2],[null,0.5],["C5",0.5],["D5",1],["E5",1],["G5",1],["E5",2],
             ["F5",1],["E5",0.5],["D5",0.5],["C5",2],["D5",1],["B4",1],["G4",2],[null,2]],
  }),
  "night-compile": render({
    bpm: 124, bars: 40, leadDuty: 0.5,
    chords: [["D4","F4","A4"],["Bb3","D4","F4"],["C4","E4","G4"],["A3","C#4","E4"]],
    melody: [["A4",0.5],["D5",0.5],["F5",0.5],["A5",0.5],["G5",1],["F5",0.5],["E5",0.5],["D5",1.5],[null,0.5],["F5",1],
             ["E5",0.5],["D5",0.5],["C5",1],["E5",1],["G5",1.5],[null,0.5],["F5",0.5],["E5",0.5],["C#5",1],["A4",1],[null,2]],
  }),
  "low-tide": render({
    bpm: 78, bars: 22, swing: 0.3, hat: true, mood: 0.8,
    chords: [["E3","G3","B3"],["C3","E3","G3"],["D3","F#3","A3"],["B2","D#3","F#3"]],
    melody: [["B4",1.5],["A4",0.5],["G4",1],["E4",1],["F#4",2],[null,1],["D4",1],["E4",1],["G4",1],["B4",1],["D5",1],["C5",2],["B4",1],["A4",1],["F#4",2],[null,2]],
  }),
};

mkdirSync("public/audio", { recursive: true });
for (const [name, s] of Object.entries(tracks)) {
  writeFileSync(`public/audio/${name}.wav`, wav(s));
  console.log(name, (s.length / SR).toFixed(1) + "s", ((44 + s.length) / 1024).toFixed(0) + "KB");
}
