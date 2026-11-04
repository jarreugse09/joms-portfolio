// UI sounds synthesized with Web Audio: a soft tick on hover, a press on click.
// Browsers only allow audio after the first click/key, so hovers before that stay silent.

let ctx: AudioContext | null = null;
let enabled = true;
const listeners = new Set<(on: boolean) => void>();

export function soundOn() { return enabled; }
export function setSound(on: boolean) {
  enabled = on;
  try { localStorage.setItem("jx-sound", on ? "1" : "0"); } catch {}
  listeners.forEach((l) => l(on));
}
export function onSound(fn: (on: boolean) => void) { listeners.add(fn); return () => listeners.delete(fn); }

function audio() {
  if (ctx) return ctx;
  const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  return ctx;
}

function noise(ac: AudioContext, freq: number, q: number, peak: number, decay: number, at = 0) {
  const t = ac.currentTime + at;
  const len = Math.ceil((decay + 0.03) * ac.sampleRate);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t); src.stop(t + decay + 0.03);
}

function tone(ac: AudioContext, freq: number, peak: number, decay: number, at = 0) {
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  o.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(ac.destination);
  o.start(t); o.stop(t + decay + 0.03);
}

export function play(kind: "hover" | "press" | "toggle") {
  // never create the AudioContext here: creating one is slow, so only a click/key (unlock) does it
  const ac = ctx;
  if (!enabled || !ac || ac.state !== "running") return;
  if (kind === "hover") { noise(ac, 5200, 1.8, 0.22, 0.02); tone(ac, 2600, 0.025, 0.012); }
  if (kind === "press") { noise(ac, 1700, 1.4, 0.3, 0.025); }
  if (kind === "toggle") { noise(ac, 2200, 1.6, 0.25, 0.018); noise(ac, 3800, 1.6, 0.2, 0.02, 0.024); }
}

/** Wire delegated listeners once for the whole page. */
export function installSfx() {
  try { enabled = localStorage.getItem("jx-sound") !== "0"; } catch {}
  const unlock = () => { const ac = audio(); if (ac && ac.state === "suspended") ac.resume().catch(() => {}); };
  let last: Element | null = null;
  let lastT = 0;
  const over = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = (e.target as Element | null)?.closest?.("a,button,[role=slider],summary");
    if (!el || el === last) { if (!el) last = null; return; }
    last = el;
    const now = performance.now();
    if (now - lastT < 50) return;
    lastT = now;
    play("hover");
  };
  const down = (e: PointerEvent) => {
    unlock();
    if ((e.target as Element | null)?.closest?.("a,button,[role=slider],summary")) play("press");
  };
  const key = (e: KeyboardEvent) => { unlock(); if (e.key === "Enter" || e.key === " ") { if ((e.target as Element)?.closest?.("a,button")) play("press"); } };
  addEventListener("pointerover", over, { passive: true });
  addEventListener("pointerdown", down, { passive: true });
  addEventListener("keydown", key);
  return () => { removeEventListener("pointerover", over); removeEventListener("pointerdown", down); removeEventListener("keydown", key); };
}
