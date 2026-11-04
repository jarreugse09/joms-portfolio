"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { tracks } from "@/content/site";
import { emit } from "@/lib/bus";

type Status = "stopped" | "loading" | "playing" | "paused" | "error";

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
};

// Wide screens have room in the side margin, so the player stays fully open there.
const WIDE = "(min-width: 1360px)";
const subWide = (cb: () => void) => { const m = matchMedia(WIDE); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };

/* ---------- small line icons (one stroke weight, like the reference) ---------- */
const I = {
  play: <path d="M5 3.5v9l7.5-4.5z" />,
  pause: <><path d="M5 3.5v9" /><path d="M11 3.5v9" /></>,
  prev: <><path d="M4 3.5v9" /><path d="M12.5 3.5v9L6 8z" /></>,
  next: <><path d="M12 3.5v9" /><path d="M3.5 3.5v9L10 8z" /></>,
  repeat: <><path d="M3 7V6a2 2 0 0 1 2-2h7.5" /><path d="M10.5 2l2 2-2 2" /><path d="M13 9v1a2 2 0 0 1-2 2H3.5" /><path d="M5.5 14l-2-2 2-2" /></>,
  shuffle: <><path d="M2.5 4.5h2.2c1.2 0 2 .6 2.6 1.6l1.6 3.8c.6 1 1.4 1.6 2.6 1.6h2" /><path d="M11.5 9.8l2 1.7-2 1.7" /><path d="M2.5 11.5h2.2c.8 0 1.4-.3 1.9-.8" /><path d="M9.4 5.3c.5-.5 1.1-.8 1.9-.8h2.2" /><path d="M11.5 2.8l2 1.7-2 1.7" /></>,
  list: <><path d="M2.5 4.5h7" /><path d="M2.5 8h7" /><path d="M2.5 11.5h4.5" /><path d="M12 11.5V5l2-.6" /><circle cx="11" cy="11.7" r="1.2" /></>,
  heart: <path d="M8 13.2S2.5 10 2.5 6.3A2.8 2.8 0 0 1 8 5a2.8 2.8 0 0 1 5.5 1.3C13.5 10 8 13.2 8 13.2z" />,
  power: <><path d="M8 2.5v5" /><path d="M5 4.3a4.5 4.5 0 1 0 6 0" /></>,
};
function Ic({ d, fill = false, size = 16 }: { d: React.ReactNode; fill?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  );
}

/* ---------- dithered cover art, drawn per track ---------- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function Cover({ id, px = 40, className }: { id: string; px?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const ink = getComputedStyle(c).getPropertyValue("--lcd-ink").trim() || "#1e2b3b";
    ctx.clearRect(0, 0, px, px);
    ctx.fillStyle = ink;
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      const u = x / px, v = y / px;
      let t: number;
      if (id === "harbor-lights") {
        const moon = Math.hypot(u - 0.68, v - 0.3) < 0.15 ? 0.05 : 0.75 - v * 0.5;
        t = v > 0.62 ? 0.35 + 0.35 * Math.sin(u * 22 + v * 40) * (v - 0.55) * 2 : moon;
      } else if (id === "night-compile") {
        const grid = (x % 8 === 0 || y % 8 === 0) ? 0.2 : 0.85;
        t = Math.abs(u - 0.5) < 0.18 && Math.abs(v - 0.5) < 0.18 ? 0.1 + u * 0.3 : grid - v * 0.2;
      } else {
        const d = Math.hypot(u - 0.5, v - 0.6);
        t = 0.55 + 0.4 * Math.sin(d * 34) * (1 - d);
      }
      if (t < (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16) ctx.fillRect(x, y, 1, 1);
    }
  }, [id, px]);
  return <canvas ref={ref} width={px} height={px} className={className} aria-hidden="true" />;
}

export default function Walkman() {
  const audio = useRef<HTMLAudioElement>(null);
  const viz = useRef<HTMLCanvasElement>(null);
  const graph = useRef<{ ctx: AudioContext; analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> } | null>(null);
  const [openState, setOpen] = useState(false);
  const wide = useSyncExternalStore(subWide, () => matchMedia(WIDE).matches, () => false);
  const open = wide || openState;
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("stopped");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 6;
    const raw = localStorage.getItem("jx-vol"), v = Number(raw);
    return raw !== null && Number.isFinite(v) && v >= 0 && v <= 10 ? v : 6;
  });
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [list, setList] = useState(false);
  const [aod, setAod] = useState(false); // big-cover "always-on" display
  const [likes, setLikes] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("jx-likes") || "[]"); } catch { return []; }
  });
  const track = tracks[index];
  const playing = status === "playing";
  const progress = duration ? time / duration : 0;
  const liked = likes.includes(track.id);

  useEffect(() => {
    if (audio.current) audio.current.volume = Math.pow(volume / 10, 1.6);
    localStorage.setItem("jx-vol", String(volume));
  }, [volume]);
  useEffect(() => { localStorage.setItem("jx-likes", JSON.stringify(likes)); }, [likes]);

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

  const play = useCallback(async () => {
    const a = audio.current;
    if (!a) return;
    ensureGraph();
    await graph.current?.ctx.resume().catch(() => {});
    try { setStatus("loading"); await a.play(); } catch { setStatus("error"); }
  }, []);
  const pause = () => audio.current?.pause();
  const toggle = () => (playing || status === "loading" ? pause() : play());

  const shuffleRef = useRef(shuffle);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  const go = useCallback((dir: 1 | -1) => {
    const a = audio.current;
    if (dir === -1 && a && a.currentTime > 3) { a.currentTime = 0; return; }
    setIndex((i) => {
      if (shuffleRef.current && tracks.length > 1) {
        let j = i;
        while (j === i) j = Math.floor(Math.random() * tracks.length);
        return j;
      }
      return (i + dir + tracks.length) % tracks.length;
    });
  }, []);

  const wasPlaying = useRef(false);
  useEffect(() => { wasPlaying.current = playing; }, [playing]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setTime(0); setDuration(0);
    if (wasPlaying.current) play(); else setStatus("stopped");
  }, [index, play]);

  const repeatRef = useRef(repeat);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => {
    const a = audio.current!;
    const onPlay = () => setStatus("playing");
    const onPause = () => setStatus((s) => (s === "error" ? s : "paused"));
    const onWait = () => setStatus("loading");
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => {
      if (repeatRef.current) { a.currentTime = 0; a.play().catch(() => {}); return; }
      wasPlaying.current = true; go(1);
    };
    const onErr = () => setStatus("error");
    const ev: [string, () => void][] = [["playing", onPlay], ["pause", onPause], ["waiting", onWait], ["timeupdate", onTime], ["loadedmetadata", onMeta], ["durationchange", onMeta], ["ended", onEnd], ["error", onErr]];
    ev.forEach(([n, f]) => a.addEventListener(n, f));
    return () => ev.forEach(([n, f]) => a.removeEventListener(n, f));
  }, [go]);

  useEffect(() => { emit("playing", playing); if (!playing) emit("level", 0); }, [playing]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: "jomariexe tapes" });
    navigator.mediaSession.setActionHandler("play", () => play());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => go(-1));
    navigator.mediaSession.setActionHandler("nexttrack", () => go(1));
  }, [track, play, go]);

  // level for the eye + the little dot-matrix meter on the LCD
  useEffect(() => {
    const draw = (data: Uint8Array | null) => {
      const c = viz.current;
      if (!c) return;
      const ctx = c.getContext("2d")!;
      const s = getComputedStyle(c);
      const on = s.getPropertyValue("--lcd-ink").trim(), off = s.getPropertyValue("--lcd-off").trim();
      ctx.clearRect(0, 0, c.width, c.height);
      const cols = 14, rows = 3;
      for (let b = 0; b < cols; b++) {
        const v = data ? data[Math.min(data.length - 1, b + 1)] / 255 : 0;
        const h = Math.round(v * rows);
        for (let r = 0; r < rows; r++) { ctx.fillStyle = r < h ? on : off; ctx.fillRect(b * 6, c.height - (r + 1) * 4, 4, 3); }
      }
    };
    if (!playing) { draw(null); return; }
    let raf = 0;
    const loop = () => {
      const g = graph.current;
      if (g) {
        g.analyser.getByteFrequencyData(g.data);
        let sum = 0;
        for (let i = 0; i < 6; i++) sum += g.data[i];
        emit("level", Math.min(1, sum / (6 * 255)) ** 1.5);
        if (open && !aod && !list) draw(g.data);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, open, aod, list]);

  useEffect(() => {
    if (!open || wide) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open, wide]);

  const seekTo = (p: number) => {
    const a = audio.current;
    if (!a || !duration) return;
    a.currentTime = Math.max(0, Math.min(duration - 0.05, p * duration));
    setTime(a.currentTime);
  };
  const seekPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const at = (cx: number) => { const r = el.getBoundingClientRect(); seekTo((cx - r.left) / r.width); };
    el.setPointerCapture(e.pointerId);
    at(e.clientX);
    const move = (ev: PointerEvent) => at(ev.clientX);
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };
  const seekKey = (e: React.KeyboardEvent) => {
    const a = audio.current;
    if (!a || !duration) return;
    const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 15, PageDown: -15 }[e.key];
    if (step) { e.preventDefault(); seekTo((a.currentTime + step) / duration); }
    if (e.key === "Home") { e.preventDefault(); seekTo(0); }
    if (e.key === "End") { e.preventDefault(); seekTo(0.999); }
  };

  const [line1, ...rest] = track.title.toUpperCase().split(" ");

  return (
    <aside className="deck" data-open={open} data-wide={wide} aria-label="Music player">
      <audio ref={audio} src={track.src} preload="none" />

      {open && (
        <div className="wm" id="deck-body">
          <button type="button" className="wm-card" onClick={() => go(1)} aria-label="Change tape (next track)">
            <span className="wm-card-label">{String(index + 1).padStart(2, "0")}</span>
          </button>

          <div className="wm-body">
            <div className="wm-bezel">
              <div className="wm-lcd" aria-live="polite">
                {aod && !list ? (
                  <div className="lcd-aod">
                    <Cover id={track.id} px={48} className="lcd-art lcd-art-big" />
                    <div className="lcd-aod-title">
                      <span>{line1}</span>
                      {rest.length > 0 && <span>{rest.join(" ")}</span>}
                      <span className="lcd-dim">{track.artist.toUpperCase()}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="lcd-status">
                      <span className="lcd-state" role="img" aria-label={status}>{playing ? <Ic d={I.play} fill size={11} /> : <Ic d={I.pause} size={11} />}</span>
                      <span className="lcd-meta">
                        {repeat && <span>RPT</span>}
                        {shuffle && <span>SHF</span>}
                        <span className="lcd-dim">{index + 1}/{tracks.length}</span>
                        <span>VOL {String(volume).padStart(2, "0")}</span>
                        <span className="lcd-batt" aria-hidden="true"><i /><i /><i /></span>
                      </span>
                    </div>
                    {list ? (
                      <ol className="lcd-list">
                        {tracks.map((t, i) => (
                          <li key={t.id}>
                            <button type="button" aria-current={i === index ? "true" : undefined} onClick={() => { wasPlaying.current = true; if (i === index) play(); else setIndex(i); setList(false); }}>
                              <span>{i === index ? ">" : " "}{String(i + 1).padStart(2, "0")}</span> {t.title.toUpperCase()}
                            </button>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="lcd-main">
                        <Cover id={track.id} px={40} className="lcd-art" />
                        <div className="lcd-text">
                          <div className="lcd-title"><span data-run={playing && track.title.length > 9}>{track.title.toUpperCase()}</span></div>
                          <div className="lcd-artist">{track.artist.toUpperCase()}</div>
                          <div className="lcd-album lcd-dim">TAPES</div>
                          <canvas ref={viz} className="lcd-viz" width={84} height={12} aria-hidden="true" />
                        </div>
                      </div>
                    )}
                    <div
                      className="lcd-seek"
                      role="slider"
                      tabIndex={0}
                      aria-label="Seek"
                      aria-valuemin={0}
                      aria-valuemax={Math.round(duration) || 0}
                      aria-valuenow={Math.round(time)}
                      aria-valuetext={`${fmt(time)} of ${fmt(duration)}`}
                      onPointerDown={seekPointer}
                      onKeyDown={seekKey}
                    >
                      <span className="lcd-seek-line" />
                      <span className="lcd-seek-head" style={{ left: `${progress * 100}%` }} />
                    </div>
                    <div className="lcd-times">
                      <span>{fmt(time)}</span>
                      <span>{duration ? `-${fmt(duration - time)}` : "-0:00"}</span>
                    </div>
                  </>
                )}
                {status === "error" && <div className="lcd-err">TAPE ERROR</div>}
              </div>
            </div>

            <div className="wm-mid">
              <span className="wm-led" data-on={playing} aria-hidden="true" />
              <span className="wm-grille" aria-hidden="true" />
              <button type="button" className="wm-power" onClick={() => setAod((v) => !v)} aria-pressed={aod} aria-label="Always-on display">
                <Ic d={I.power} size={12} />
              </button>
            </div>

            <div className="wm-deck">
              <span className="wm-screw" data-p="tl" /><span className="wm-screw" data-p="tr" /><span className="wm-screw" data-p="bl" /><span className="wm-screw" data-p="br" />
              <span className="wm-holes" aria-hidden="true" />
              <div className="wm-quad">
                <button type="button" className="wm-k" aria-pressed={repeat} aria-label="Repeat" onClick={() => setRepeat((v) => !v)}><Ic d={I.repeat} size={14} /></button>
                <button type="button" className="wm-k" aria-pressed={shuffle} aria-label="Shuffle" onClick={() => setShuffle((v) => !v)}><Ic d={I.shuffle} size={14} /></button>
                <button type="button" className="wm-k" aria-pressed={list} aria-label="Playlist" onClick={() => setList((v) => !v)}><Ic d={I.list} size={14} /></button>
                <button type="button" className="wm-k" aria-pressed={liked} aria-label="Like" onClick={() => setLikes((l) => (l.includes(track.id) ? l.filter((x) => x !== track.id) : [...l, track.id]))}><Ic d={I.heart} fill={liked} size={14} /></button>
              </div>
              <div className="wm-transport">
                <button type="button" className="wm-t" onClick={() => go(-1)} aria-label="Previous track"><Ic d={I.prev} size={14} /></button>
                <button type="button" className="wm-t wm-t-main" onClick={toggle} aria-label={playing ? "Pause" : "Play"}><Ic d={playing ? I.pause : I.play} size={18} /></button>
                <button type="button" className="wm-t" onClick={() => go(1)} aria-label="Next track"><Ic d={I.next} size={14} /></button>
              </div>
              <Knob value={volume} onChange={setVolume} />
            </div>
          </div>
        </div>
      )}

      {!wide && (
        <div className="deck-dock">
          <button type="button" className="dock-play" onClick={toggle} aria-label={playing ? "Pause music" : "Play music"}>
            <Ic d={playing ? I.pause : I.play} fill={!playing} size={14} />
          </button>
          <button type="button" className="dock-info" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="deck-body">
            <Cover id={track.id} px={20} className="dock-art" />
            <span className="dock-text">
              <span className="dock-title">{track.title}</span>
              <span className="dock-sub">{status === "error" ? "Couldn't load tape" : playing ? fmt(time) : "Walkman"}</span>
            </span>
            <span className="dock-chev" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{open ? <path d="M4 6l4 4 4-4" /> : <path d="M4 10l4-4 4 4" />}</svg></span>
            <span className="sr-only">{open ? "Close player" : "Open player"}</span>
          </button>
        </div>
      )}
    </aside>
  );
}

function Knob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(10, Math.round(v))));
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const y0 = e.clientY, v0 = value;
    const move = (ev: PointerEvent) => set(v0 + (y0 - ev.clientY) / 10);
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 3, PageDown: -3 }[e.key];
    if (d) { e.preventDefault(); set(value + d); }
    if (e.key === "Home") { e.preventDefault(); set(0); }
    if (e.key === "End") { e.preventDefault(); set(10); }
  };
  const angle = -135 + value * 27;
  return (
    <div className="wm-knob" role="slider" tabIndex={0} aria-label="Volume" aria-valuemin={0} aria-valuemax={10} aria-valuenow={value}
      onPointerDown={onPointerDown} onKeyDown={onKey} onWheel={(e) => set(value + (e.deltaY < 0 ? 1 : -1))}>
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r="28" className="knob-well" />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "30px 30px", transition: "transform 120ms" }}>
          {Array.from({ length: 60 }, (_, i) => (
            <rect key={i} x="29.6" y="4" width="0.8" height="4" className="knob-knurl" transform={`rotate(${i * 6} 30 30)`} />
          ))}
          <circle cx="30" cy="30" r="20" className="knob-cap" />
          <rect x="29" y="12" width="2" height="8" rx="1" className="knob-mark" />
        </g>
      </svg>
    </div>
  );
}
