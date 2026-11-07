"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Album } from "@/lib/albums";
import { emit } from "@/lib/bus";
import { play as sfx } from "@/lib/sfx";
import { createScreen, ditherCover, LIST, PITCH, type Colors, type ScreenView } from "@/lib/dotmatrix";
import { drawReels, geometry } from "@/lib/tape";
import SdCard from "./SdCard";

type Status = "stopped" | "loading" | "playing" | "paused" | "error";
type Phase = "in" | "popped" | "flying" | "out" | "inserting" | "reading";

// Wide screens have room in the side margin, so the player stays fully open there.
const WIDE = "(min-width: 1360px)";
const subWide = (cb: () => void) => { const m = matchMedia(WIDE); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
const fmt = (s: number) => { s = Math.max(0, Number.isFinite(s) ? s : 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };
const stored = (key: string, fallback: number, max: number) => {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key), v = Number(raw);
  return raw !== null && Number.isInteger(v) && v >= 0 && v <= max ? v : fallback;
};

/* ---------- line icons ---------- */
const I = {
  play: <path d="M5 3.5v9l7.5-4.5z" />,
  pause: <><path d="M5 3.5v9" /><path d="M11 3.5v9" /></>,
  prev: <><path d="M4 3.5v9" /><path d="M12.5 3.5v9L6 8z" /></>,
  next: <><path d="M12 3.5v9" /><path d="M3.5 3.5v9L10 8z" /></>,
  repeat: <><path d="M3 7V6a2 2 0 0 1 2-2h7.5" /><path d="M10.5 2l2 2-2 2" /><path d="M13 9v1a2 2 0 0 1-2 2H3.5" /><path d="M5.5 14l-2-2 2-2" /></>,
  shuffle: <><path d="M2.5 4.5h2.2c1.2 0 2 .6 2.6 1.6l1.6 3.8c.6 1 1.4 1.6 2.6 1.6h2" /><path d="M11.5 9.8l2 1.7-2 1.7" /><path d="M2.5 11.5h2.2c.8 0 1.4-.3 1.9-.8" /><path d="M9.4 5.3c.5-.5 1.1-.8 1.9-.8h2.2" /><path d="M11.5 2.8l2 1.7-2 1.7" /></>,
  list: <><path d="M2.5 4.5h7" /><path d="M2.5 8h7" /><path d="M2.5 11.5h4.5" /><path d="M12 11.5V5l2-.6" /><circle cx="11" cy="11.7" r="1.2" /></>,
  heart: <path d="M8 13.2S2.5 10 2.5 6.3A2.8 2.8 0 0 1 8 5a2.8 2.8 0 0 1 5.5 1.3C13.5 10 8 13.2 8 13.2z" />,
};
function Ic({ d, fill = false, size = 16 }: { d: React.ReactNode; fill?: boolean; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

export default function Walkman({ albums }: { albums: Album[] }) {
  const audio = useRef<HTMLAudioElement>(null);
  const screenEl = useRef<HTMLCanvasElement>(null);
  const reelsEl = useRef<HTMLCanvasElement>(null);
  const wrapEl = useRef<HTMLDivElement>(null);
  const slotEl = useRef<HTMLButtonElement>(null);
  const fanEl = useRef<HTMLDivElement>(null);
  const cassEl = useRef<HTMLDivElement>(null);
  const graph = useRef<{ ctx: AudioContext; analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> } | null>(null);

  const [openState, setOpen] = useState(false);
  const wide = useSyncExternalStore(subWide, () => matchMedia(WIDE).matches, () => false);
  const open = wide || openState;
  const [a, setA] = useState(() => stored("jx-album", 0, Math.max(0, albums.length - 1)));
  const [i, setI] = useState(0);
  const [status, setStatus] = useState<Status>("stopped");
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(() => stored("jx-vol", 6, 10));
  const [rpt, setRpt] = useState(false);
  const [shf, setShf] = useState(false);
  const [view, setView] = useState<"main" | "list">("main");
  const [listTop, setListTop] = useState(0);
  const [volPop, setVolPop] = useState(false);
  const [phase, setPhase] = useState<Phase>("in");
  const [tray, setTray] = useState(false);
  const [hidden, setHidden] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const [likes, setLikes] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("jx-likes") || "[]"); } catch { return []; }
  });

  const album = albums[a] ?? albums[0];
  const song = album?.songs[i] ?? album?.songs[0];
  const playing = status === "playing";
  const liked = !!song && likes.includes(song.id);

  // everything the animation loop needs, without re-subscribing it on every render
  const snap = useRef({ a, i, album, song, playing, rpt, shf, volume, view, listTop, volPop, phase, status });
  useLayoutEffect(() => { snap.current = { a, i, album, song, playing, rpt, shf, volume, view, listTop, volPop, phase, status }; });
  const fx = useRef({ aL: 0, aR: 1, boost: 0, dir: 1, readAt: 0, level: 0, busy: false, wasOn: false, covers: new Map<string, Uint8Array | null>() });

  useEffect(() => { if (audio.current) audio.current.volume = Math.pow(volume / 10, 1.6); localStorage.setItem("jx-vol", String(volume)); }, [volume]);
  useEffect(() => { localStorage.setItem("jx-likes", JSON.stringify(likes)); }, [likes]);
  useEffect(() => { localStorage.setItem("jx-album", String(a)); }, [a]);

  /* ---------- audio ---------- */
  const ensureGraph = () => {
    if (graph.current || !audio.current) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audio.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.72;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      graph.current = { ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
    } catch {}
  };
  const start = useCallback(async () => {
    const el = audio.current;
    if (!el) return;
    ensureGraph();
    await graph.current?.ctx.resume().catch(() => {});
    try { setStatus("loading"); await el.play(); } catch { setStatus("error"); }
  }, []);
  const pause = () => audio.current?.pause();
  const toggle = () => (playing || status === "loading" ? pause() : start());

  const go = useCallback((dir: 1 | -1) => {
    const el = audio.current, n = snap.current.album.songs.length;
    fx.current.boost = 0.35; fx.current.dir = dir;
    if (dir === -1 && el && el.currentTime > 3) { el.currentTime = 0; return; }
    setI((cur) => {
      if (snap.current.shf && n > 1) { let j = cur; while (j === cur) j = Math.floor(Math.random() * n); return j; }
      return (cur + dir + n) % n;
    });
  }, []);

  // a new song: reset time, keep playing if we were
  const wasPlaying = useRef(false);
  useEffect(() => { wasPlaying.current = playing; }, [playing]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setTime(0);
    if (wasPlaying.current) start(); else setStatus("stopped");
  }, [a, i, start]);

  useEffect(() => {
    const el = audio.current!;
    const onPlay = () => setStatus("playing");
    const onPause = () => setStatus((s) => (s === "error" ? s : "paused"));
    const onWait = () => setStatus("loading");
    const onTime = () => setTime(el.currentTime);
    const onEnd = () => {
      if (snap.current.rpt) { el.currentTime = 0; el.play().catch(() => {}); return; }
      wasPlaying.current = true; go(1);
    };
    const onErr = () => setStatus("error");
    const ev: [string, () => void][] = [["playing", onPlay], ["pause", onPause], ["waiting", onWait], ["timeupdate", onTime], ["ended", onEnd], ["error", onErr]];
    ev.forEach(([n, f]) => el.addEventListener(n, f));
    return () => ev.forEach(([n, f]) => el.removeEventListener(n, f));
  }, [go]);

  useEffect(() => { emit("playing", playing); if (!playing) emit("level", 0); }, [playing]);

  useEffect(() => {
    if (!song || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist, album: album.name, artwork: [{ src: song.art, sizes: "300x300", type: "image/jpeg" }] });
    navigator.mediaSession.setActionHandler("play", () => start());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => go(-1));
    navigator.mediaSession.setActionHandler("nexttrack", () => go(1));
  }, [song, album, start, go]);

  // cover art → dot cells (Apple's artwork allows cross-origin reads)
  useEffect(() => {
    if (!song || fx.current.covers.has(song.art)) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => fx.current.covers.set(song.art, ditherCover(img));
    img.src = song.art;
  }, [song]);

  /* ---------- animation loop: level for the eye, reels, LCD ---------- */
  useEffect(() => {
    const screen = screenEl.current ? createScreen(screenEl.current) : null;
    let colors: Colors | null = null;
    const readColors = () => {
      const el = screenEl.current;
      if (!el) return;
      const cs = getComputedStyle(el), g = (n: string) => cs.getPropertyValue(n).trim();
      colors = { ink: g("--lcd-ink"), cell: g("--lcd-cell"), dim: g("--lcd-dim"), ghost: g("--lcd-ghost"), shadow: g("--lcd-shadow") };
    };
    readColors();
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", readColors);

    let raf = 0, prev = performance.now(), lastDraw = 0, reelsDirty = true;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      const s = snap.current, f = fx.current, el = audio.current;
      // loudness → eye + screen meter
      const g = graph.current;
      if (s.playing && g) {
        g.analyser.getByteFrequencyData(g.data);
        let sum = 0;
        for (let k = 0; k < 6; k++) sum += g.data[k];
        f.level = Math.min(1, sum / (6 * 255)) ** 1.5;
        emit("level", f.level);
      } else f.level *= 0.85;

      const t = el?.currentTime ?? 0, d = el && Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 30;
      // reels: steady tape speed, so the thinner pack spins faster
      const rc = reelsEl.current;
      if (rc) {
        const speed = (s.playing ? 16 : 0) + (f.boost > 0 ? 220 : 0);
        if (f.boost > 0) f.boost -= dt;
        if (speed && !reduced()) {
          const { pack } = geometry(rc.clientWidth, rc.clientHeight), p = t / d, dir = f.boost > 0 ? f.dir : 1;
          f.aL -= (dir * speed * dt) / pack(1 - p); f.aR -= (dir * speed * dt) / pack(p);
          reelsDirty = true;
        }
        if (reelsDirty || s.playing) { drawReels(rc, { p: t / d, aL: f.aL, aR: f.aR }); reelsDirty = false; }
      }
      // LCD at ~30fps
      if (screen && colors && s.song && now - lastDraw > 33) {
        lastDraw = now;
        const v: ScreenView = s.phase === "out" || s.phase === "flying" || s.phase === "popped" ? "out" : s.phase === "reading" ? "reading" : s.volPop ? "volume" : s.view;
        screen.draw({
          view: v, playing: s.playing, index: s.i, count: s.album.songs.length, rpt: s.rpt, shf: s.shf, volume: s.volume,
          title: s.song.title, artist: s.status === "error" ? "Preview unavailable" : s.song.artist, album: s.album.name, short: s.album.short,
          t, d, titles: s.album.songs.map((x) => x.title), listTop: s.listTop, cover: f.covers.get(s.song.art) ?? null,
          level: f.level, readFrac: Math.min(1, (now - f.readAt) / 850),
        }, colors, now, reduced());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); mo.disconnect(); mq.removeEventListener("change", readColors); };
  }, [open]);

  /* ---------- SD card swap ---------- */
  const center = (el: Element) => { const r = el.getBoundingClientRect(), w = wrapEl.current!.getBoundingClientRect(); return [r.left - w.left + r.width / 2, r.top - w.top + r.height / 2]; };
  const fanCard = (n: number) => fanEl.current?.querySelector<HTMLElement>(`[data-n="${n}"]`) ?? null;
  // fly a copy of a card from one element to another in an arc
  function fly(from: HTMLElement, to: HTMLElement, rot0: number, dur: number) {
    const svg = from.querySelector("svg");
    if (!svg || !wrapEl.current || reduced()) return Promise.resolve();
    const [x0, y0] = center(from), [x1, y1] = center(to), w0 = from.offsetWidth, h0 = from.offsetHeight, s1 = to.offsetWidth / w0;
    const el = document.createElement("div");
    el.className = "fly";
    el.style.left = `${x0 - w0 / 2}px`; el.style.top = `${y0 - h0 / 2}px`;
    el.appendChild(svg.cloneNode(true));
    wrapEl.current.appendChild(el);
    const dx = x1 - x0, dy = y1 - y0;
    return el.animate([
      { transform: `translate(0,0) rotate(${rot0}deg) scale(1)` },
      { transform: `translate(${dx / 2}px, ${dy / 2 - 40}px) rotate(${rot0 * 0.4 + (dx > 0 ? 8 : -8)}deg) scale(${(1 + s1) / 2 + 0.12})`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${s1})` },
    ], { duration: dur, easing: "cubic-bezier(.45,0,.25,1)", fill: "forwards" }).finished.then(() => el.remove(), () => el.remove());
  }

  async function eject() {
    const f = fx.current;
    if (f.busy || phase !== "in") return;
    f.busy = true; f.wasOn = playing;
    pause(); setView("main"); sfx("eject");
    setLast(a); setHidden(a); setPhase("popped"); setTray(true);
    await wait(420);
    setPhase("flying");
    const home = fanCard(a);
    if (home && slotEl.current) await fly(slotEl.current, home.querySelector(".sd") as HTMLElement, 0, 360);
    setHidden(null); sfx("drop"); setPhase("out");
    f.busy = false;
    home?.focus({ preventScroll: true });
  }

  async function insert(n: number) {
    const f = fx.current;
    if (f.busy || snap.current.phase !== "out") return;
    f.busy = true;
    const card = fanCard(n);
    sfx("lift"); setHidden(n); setPhase("flying");
    if (card && slotEl.current) await fly(card.querySelector(".sd") as HTMLElement, slotEl.current, card.matches(":hover") ? 0 : parseFloat(card.style.getPropertyValue("--rot")) || 0, 460);
    const changed = n !== snap.current.a;
    if (changed) { setA(n); setI(0); setTime(0); setListTop(0); }
    setHidden(null); setPhase("inserting"); setTray(false); sfx("insert");
    await wait(170);
    const c = cassEl.current;
    if (c) { c.classList.remove("jolt"); void c.offsetWidth; c.classList.add("jolt"); }
    f.boost = 0.2; f.dir = 1;
    await wait(140);
    f.readAt = performance.now(); setPhase("reading"); sfx("read");
    await wait(changed ? 850 : 380);
    setPhase("in");
    f.busy = false;
    if (f.wasOn) { wasPlaying.current = true; start(); }
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (snap.current.phase === "out") insert(snap.current.a);
      else if (open && !wide) setOpen(false);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  });

  /* ---------- volume knob ---------- */
  const popTimer = useRef(0);
  const setVol = (v: number) => {
    v = Math.max(0, Math.min(10, Math.round(v)));
    if (v === snap.current.volume) return;
    setVolume(v); sfx("tick"); setVolPop(true);
    clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setVolPop(false), 1100);
  };
  const knobDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const y0 = e.clientY, v0 = volume;
    const move = (ev: PointerEvent) => setVol(v0 + (y0 - ev.clientY) / 12);
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };
  const knobKey = (e: React.KeyboardEvent) => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 3, PageDown: -3 }[e.key];
    if (d) { e.preventDefault(); setVol(volume + d); }
    if (e.key === "Home") { e.preventDefault(); setVol(0); }
    if (e.key === "End") { e.preventDefault(); setVol(10); }
  };
  const knobRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = knobRef.current;
    if (!el) return;
    const w = (e: WheelEvent) => { e.preventDefault(); setVol(snap.current.volume + (e.deltaY < 0 ? 1 : -1)); };
    el.addEventListener("wheel", w, { passive: false });
    return () => el.removeEventListener("wheel", w);
  });

  /* ---------- screen: seek, song list ---------- */
  const scroll = (d: number) => setListTop((t) => Math.max(0, Math.min(t + d, (album?.songs.length ?? 0) - LIST.vis)));
  const dragged = useRef(0);
  const screenClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== "in" || performance.now() - dragged.current < 250 || !screenEl.current) return;
    const h = createScreenHit(screenEl.current, e.clientX, e.clientY);
    const el = audio.current;
    if (h.zone === "seek" && el) {
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      if (d) { const nt = Math.max(0, Math.min(0.999, h.col / h.cols)) * d; fx.current.boost = 0.3; fx.current.dir = nt < el.currentTime ? -1 : 1; el.currentTime = nt; }
    } else if (view === "list" && h.zone === "list") {
      const n = listTop + h.listRow;
      if (n >= 0 && n < album.songs.length) { wasPlaying.current = true; if (n === i) start(); else { fx.current.boost = 0.35; setI(n); } setView("main"); }
    }
  };
  useEffect(() => {
    const el = screenEl.current;
    if (!el) return;
    let acc = 0;
    const w = (e: WheelEvent) => {
      e.preventDefault(); // the wheel belongs to the screen, never the page
      if (snap.current.view !== "list" || snap.current.phase !== "in") return;
      acc += e.deltaY;
      if (Math.abs(acc) < 30) return;
      scroll(Math.sign(acc)); acc = 0; sfx("tick");
    };
    el.addEventListener("wheel", w, { passive: false });
    return () => el.removeEventListener("wheel", w);
  });
  const screenDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (view !== "list" || e.pointerType === "mouse") return;
    const el = e.currentTarget, y0 = e.clientY, t0 = listTop;
    let moved = false;
    const move = (ev: PointerEvent) => { const d = Math.round((y0 - ev.clientY) / (9 * PITCH)); if (d) moved = true; setListTop(Math.max(0, Math.min(t0 + d, album.songs.length - LIST.vis))); };
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); if (moved) dragged.current = performance.now(); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };
  const screenKey = (e: React.KeyboardEvent) => {
    const el = audio.current;
    if (view === "list" && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); scroll(e.key === "ArrowDown" ? 1 : -1); return; }
    const d = { ArrowRight: 5, ArrowLeft: -5 }[e.key];
    if (d && el && Number.isFinite(el.duration)) { e.preventDefault(); el.currentTime = Math.max(0, Math.min(el.duration - 0.1, el.currentTime + d)); }
  };

  if (!album || !song) return null;
  const n = albums.length;

  return (
    <aside className="deck" data-open={open} data-wide={wide} aria-label="Music player">
      <audio ref={audio} src={song.preview} preload="none" crossOrigin="anonymous" />

      {open && (
        <div className="wm" id="deck-body" data-card={phase} data-tray={tray ? "open" : "closed"} data-playing={playing} style={{ "--card": album.color, "--v": volume / 10, "--pcb": PCB } as React.CSSProperties}>
          <div className="wm-wrap" ref={wrapEl}>
            <div className="tray" role="dialog" aria-label="Choose an SD card" aria-hidden={!tray}>
              <div className="tray-head"><span>SD CARDS</span><button type="button" onClick={() => insert(a)}>Put it back</button></div>
              <div className="fan" ref={fanEl}>
                {albums.map((al, k) => (
                  <button key={al.key} type="button" className="slotcard" data-n={k} data-hidden={hidden === k} data-last={last === k} onClick={() => insert(k)} aria-label={`Load ${al.name}`}
                    style={{ "--rot": `${(k - (n - 1) / 2) * 6}deg`, "--lift": `${Math.abs(k - (n - 1) / 2) * 3}px` } as React.CSSProperties}>
                    <span className="sd"><SdCard name={al.name} seed={al.key} color={al.color} arts={al.arts} width={46} /></span>
                    <small>{al.short} · {al.songs.length}</small>
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="sd sd-slot" ref={slotEl} onClick={eject} aria-label={`Eject SD card (${album.name})`}>
              <SdCard name={album.name} seed={album.key} color={album.color} arts={album.arts} width={60} />
            </button>

            <div className="wm-body">
              <div className="bezel">
                <div className="lcd">
                  <canvas ref={screenEl} className="screen" data-lenis-prevent tabIndex={0} role="img" aria-label={`${song.title} by ${song.artist}, ${album.name}. ${fmt(time)}`}
                    onClick={screenClick} onPointerDown={screenDown} onKeyDown={screenKey} />
                </div>
              </div>
              <div className="print"><i className="screw" style={{ "--r": "28deg" } as React.CSSProperties} /><span>JX-01</span><span className="sp" /><span>AUTO REVERSE</span><i className="screw" style={{ "--r": "-14deg" } as React.CSSProperties} /></div>
              <div className="cass" ref={cassEl}>
                <i className="screw c-tl" style={{ "--r": "12deg" } as React.CSSProperties} /><i className="screw c-tr" style={{ "--r": "-30deg" } as React.CSSProperties} />
                <i className="screw c-bl" style={{ "--r": "40deg" } as React.CSSProperties} /><i className="screw c-br" style={{ "--r": "5deg" } as React.CSSProperties} />
                <div className="cl">
                  <div className="cl-top"><b>A</b><span>STEREO</span><span>NOISE RED.</span><span className="no">NO.</span></div>
                  <div className="cl-hand">{album.hand}</div>
                  <div className="cl-mid">
                    <span className="cl-len">30</span>
                    <div className="cl-band"><div className="cl-win"><canvas ref={reelsEl} /></div></div>
                    <span className="cl-type">TYPE I</span>
                  </div>
                  <div className="cl-foot"><span className="cl-brand">JX</span><span className="cl-model">C-30 · PREVIEW</span></div>
                  <span className="cl-tag">side A</span>
                </div>
                <div className="cass-low" aria-hidden="true"><i className="hole" /><i className="sq" /><i className="sq" /><i className="hole" /></div>
              </div>
              <div className="ctrl">
                <div className="modes">
                  <button type="button" className="ks" aria-pressed={rpt} aria-label="Repeat" onClick={() => setRpt((v) => !v)}><Ic d={I.repeat} size={12} /></button>
                  <button type="button" className="ks" aria-pressed={shf} aria-label="Shuffle" onClick={() => setShf((v) => !v)}><Ic d={I.shuffle} size={12} /></button>
                  <button type="button" className="ks" aria-pressed={view === "list"} aria-label="Song list" onClick={() => { setView((v) => (v === "list" ? "main" : "list")); setListTop(Math.max(0, Math.min(i - 1, album.songs.length - LIST.vis))); }}><Ic d={I.list} size={12} /></button>
                  <button type="button" className="ks" aria-pressed={liked} aria-label="Like" onClick={() => setLikes((l) => (l.includes(song.id) ? l.filter((x) => x !== song.id) : [...l, song.id]))}><Ic d={I.heart} fill={liked} size={12} /></button>
                </div>
                <div className="trans">
                  <button type="button" onClick={() => go(-1)} aria-label="Previous song"><Ic d={I.prev} size={14} /></button>
                  <button type="button" className="play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}><Ic d={playing ? I.pause : I.play} size={18} /></button>
                  <button type="button" onClick={() => go(1)} aria-label="Next song"><Ic d={I.next} size={14} /></button>
                </div>
                <div className="knob" ref={knobRef} data-lenis-prevent role="slider" tabIndex={0} aria-label="Volume" aria-valuemin={0} aria-valuemax={100} aria-valuenow={volume * 10} aria-valuetext={`${volume * 10}%`} onPointerDown={knobDown} onKeyDown={knobKey}>
                  <svg className="k-scale" viewBox="0 0 72 72" aria-hidden="true">
                    {Array.from({ length: 11 }, (_, k) => { const ang = ((-135 + k * 27) * Math.PI) / 180; return <circle key={k} className={`k-dot${k <= volume && volume > 0 ? " on" : ""}`} cx={(36 + 32 * Math.sin(ang)).toFixed(2)} cy={(36 - 32 * Math.cos(ang)).toFixed(2)} r="1.5" />; })}
                  </svg>
                  <span className="k-well" /><span className="k-skirt" /><span className="k-light" /><span className="k-cap" /><span className="k-ind"><i /></span>
                </div>
              </div>
            </div>
          </div>
          <p className="wm-credit">30-second previews from <a href={song.url || album.url} target="_blank" rel="noopener noreferrer">Apple Music</a> · <a href={song.url || album.url} target="_blank" rel="noopener noreferrer">full song ↗</a></p>
        </div>
      )}

      {!wide && (
        <div className="deck-dock">
          <button type="button" className="dock-play" onClick={toggle} aria-label={playing ? "Pause music" : "Play music"}>
            <Ic d={playing ? I.pause : I.play} fill={!playing} size={14} />
          </button>
          <button type="button" className="dock-info" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="deck-body">
            <span className="dock-art" style={{ backgroundImage: `url(${song.art})` }} aria-hidden="true" />
            <span className="dock-text">
              <span className="dock-title">{song.title}</span>
              <span className="dock-sub">{status === "error" ? "Preview unavailable" : playing ? `${fmt(time)} · ${song.artist}` : song.artist}</span>
            </span>
            <span className="dock-chev" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{open ? <path d="M4 6l4 4 4-4" /> : <path d="M4 10l4-4 4 4" />}</svg></span>
            <span className="sr-only">{open ? "Close player" : "Open player"}</span>
          </button>
        </div>
      )}
    </aside>
  );
}

/** An original circuit board seen faintly through the frosted shell. Seeded, so it is identical on server and client. */
function buildBoard() {
  const W = 312, H = 620, G = 6;
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const snap = (v: number) => Math.round(v / G) * G;
  let traces = "", pads = "", parts = "";
  for (let k = 0; k < 70; k++) {
    let x = snap(r() * W), y = snap(r() * H), d = `M${x} ${y}`;
    for (let s = 0, n = 3 + Math.floor(r() * 3); s < n; s++) {
      const len = snap(12 + r() * 60), dir = Math.floor(r() * 4);
      if (dir === 0) x += len; else if (dir === 1) y += len; else if (dir === 2) { x += len * 0.7; y += len * 0.7; } else { x -= len * 0.7; y += len * 0.7; }
      d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    traces += `<path d="${d}"/>`;
    pads += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.2"/>`;
  }
  for (let k = 0; k < 9; k++) {
    const w = snap(24 + r() * 40), hh = snap(18 + r() * 30), x = snap(10 + r() * (W - w - 20)), y = snap(10 + r() * (H - hh - 20));
    let pins = "";
    for (let p = x + 4; p < x + w - 2; p += 4) pins += `<rect x="${p}" y="${y - 3}" width="2" height="3"/><rect x="${p}" y="${y + hh}" width="2" height="3"/>`;
    parts += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="1.5" fill="#1b1d22"/><g fill="#a8adb5">${pins}</g>`;
  }
  for (let k = 0; k < 40; k++) { const x = snap(r() * W), y = snap(r() * H), v = r() > 0.5; parts += `<rect x="${x}" y="${y}" width="${v ? 3 : 6}" height="${v ? 6 : 3}" fill="${r() > 0.5 ? "#2a2d33" : "#7b6a52"}"/>`; }
  const holes = [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#b5bac2" stroke-width="2"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><filter id="f" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.9"/></filter></defs><rect width="${W}" height="${H}" fill="#3c4148"/><g filter="url(#f)"><g fill="none" stroke="#8d939c" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${traces}</g><g fill="#b5bac2">${pads}</g>${parts}${holes}<text x="${W - 70}" y="${H - 30}" font-family="monospace" font-size="7" fill="#c9ccd2">JX-01 REV.B</text></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const PCB = buildBoard();

// hit-testing without keeping a second screen instance around
let hitScreen: ReturnType<typeof createScreen> | null = null, hitCanvas: HTMLCanvasElement | null = null;
function createScreenHit(canvas: HTMLCanvasElement, x: number, y: number) {
  if (hitCanvas !== canvas) { hitScreen = createScreen(canvas); hitCanvas = canvas; }
  return hitScreen!.hit(x, y);
}
