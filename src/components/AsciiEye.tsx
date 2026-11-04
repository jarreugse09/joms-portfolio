"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { on } from "@/lib/bus";

// The text the eye is made of: the owner's own intro, written like a README.
const TEXT =
  "# jomariexe Jomarie Esguerra, full-stack developer from Manila, Philippines. " +
  "I build websites and apps that people actually use. " +
  "[GitHub](https://github.com/jarreugse09) [LinkedIn](https://linkedin.com/in/jomarie-esguerra) " +
  "Shipped: Setmona, RMB Law, BYD Alabang, TUPasok, Perps, AI-SEE, Librag. " +
  "Transforming brilliant ideas into tangible necessity. ";

// Eye geometry, as fractions of the eye box (Hancore's proportions).
const LID_UP = 0.47, LID_LOW = 0.37, IRIS = 0.33, REACH = 0.5, RISE = 0.14;
const GLYPH = 5.5, CW = GLYPH * 0.6, CH = GLYPH * 1.08, LEVELS = 13;
const SLEEP_AFTER = 15000;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (a: number, b: number, k: number) => a + (b - a) * k;

const rgbOf = (value: string) => {
  const c = document.createElement("canvas").getContext("2d")!;
  c.fillStyle = value || "#888";
  const s = c.fillStyle;
  if (s.startsWith("#")) return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)).join(",");
  return (s.match(/\d+/g) || [136, 136, 136]).slice(0, 3).join(",");
};

function Eye({ size = 240 }: { size?: number }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const line = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const canvas = cvs.current!, svg = line.current!;
    const g = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(pointer: fine)").matches;

    const W = size, EH = Math.round(size / 1.7), H = EH + 56;
    const cx = W / 2, cy = EH / 2;
    const cols = Math.ceil(W / CW), rows = Math.ceil(EH / CH);
    const levels = new Int8Array(cols * rows);
    let family = "monospace", ink = "20,20,20", red = "200,20,27";
    const readColors = () => {
      const s = getComputedStyle(canvas);
      ink = rgbOf(s.getPropertyValue("--ink").trim());
      red = rgbOf(s.getPropertyValue("--red").trim());
      if (ready) buildAtlas();
    };
    let ready = false;
    // Glyph atlas: every printable ASCII char pre-drawn once (regular + bold row), then stamped
    // with drawImage. Far cheaper than fillText on every frame.
    const atlas = document.createElement("canvas"), ag = atlas.getContext("2d")!;
    let dpr = 1, slotW = 8, slotH = 12;
    const buildAtlas = () => {
      slotW = Math.ceil(CW * dpr) + 2; slotH = Math.ceil(CH * dpr) + 1;
      atlas.width = slotW * 95; atlas.height = slotH * 2;
      ag.clearRect(0, 0, atlas.width, atlas.height);
      ag.font = `${GLYPH * dpr}px ${family}`; ag.textBaseline = "alphabetic"; ag.fillStyle = `rgb(${ink})`;
      for (let i = 0; i < 95; i++) {
        const ch = String.fromCharCode(32 + i), x = i * slotW + 1, y = GLYPH * 0.79 * dpr;
        ag.fillText(ch, x, y);
        ag.fillText(ch, x, y + slotH); ag.fillText(ch, x + 0.45 * dpr, y + slotH); // faux bold
      }
      dirty = true;
    };
    let dirty = true;
    const setup = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      buildAtlas();
    };
    svg.innerHTML = '<line x1="0" y1="0" x2="0" y2="0"/><rect width="22" height="14"/>';
    const sLine = svg.firstChild as SVGLineElement, sRect = svg.lastChild as SVGRectElement;
    const codes = Uint8Array.from(TEXT, (ch) => { const c = ch.charCodeAt(0) - 32; return c >= 0 && c < 95 ? c : 0; });

    // gaze (-1..1), lid openness, iris zoom, pupil dilation, iris spin
    const st = { gx: 0, gy: 0, tx: 0, ty: 0, open: 0, iz: 0.92, dil: 0.45, spin: 0 };
    let blinkAt = -1e9, nextBlink = performance.now() + 2600 + Math.random() * 3800, squintUntil = 0;
    let lastInput = performance.now(), playing = false, level = 0, born = performance.now();
    let raf = 0, visible = true, disposed = false, saccade = 0, last = 0;
    let pointer: { x: number; y: number; at: number } | null = null;
    let hot = false, targetLabel = "None";
    const offset = Math.floor(Math.random() * TEXT.length);

    const wake = () => { lastInput = performance.now(); };
    const onMove = (e: PointerEvent) => {
      wake();
      pointer = { x: e.clientX, y: e.clientY, at: performance.now() };
      const el = (e.target as Element | null)?.closest?.("a,button,[role=slider],input,summary");
      hot = !!el;
      targetLabel = el ? `'${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 18)}'` : "None";
    };
    const onDown = () => { wake(); squintUntil = performance.now() + 380; };
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onDown, { passive: true });
    addEventListener("scroll", wake, { passive: true });
    addEventListener("keydown", wake);
    const offL = on("level", (l) => (level = l));
    const offP = on("playing", (p) => { playing = p; if (p) wake(); });
    const themeObs = new MutationObserver(readColors);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else svg.style.opacity = "0"; });
    io.observe(canvas);

    const pupil = () => {
      const ri = EH * IRIS * st.iz;
      return { x: cx + st.gx * W * 0.47 * REACH, y: cy + st.gy * EH * RISE, ri, rp: ri * (0.24 + 0.26 * st.dil) };
    };

    // brightness 0..1 at a point, or -1 for empty
    function sample(x: number, y: number, p: ReturnType<typeof pupil>, open: number) {
      const u = (x - cx) / (W * 0.47);
      if (u <= -1 || u >= 1) return -1;
      const k = 1 - u * u;
      const top = cy - EH * LID_UP * open * k ** 0.8;
      const bot = cy + EH * LID_LOW * open * k ** 1.15;
      const rimUp = Math.max(0, 1 - Math.abs(y - top) / 1.7) * 0.95 * Math.sqrt(k);
      const rimLow = Math.max(0, 1 - Math.abs(y - bot) / 1.3) * 0.5 * Math.sqrt(k);
      const rim = Math.max(rimUp, rimLow);
      if (y < top || y > bot) return rim > 0.05 ? rim : -1;
      const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
      let v: number;
      if (d < p.rp) v = 0; // pupil
      else if (d < p.ri) { // iris: radial fibres, a bright collar, darker rim
        const rr = (d - p.rp) / (p.ri - p.rp), a = Math.atan2(dy, dx) + Math.round(st.spin / 0.04) * 0.04;
        const fibre = 0.5 + 0.5 * Math.sin(a * 29 + 2.1 * Math.sin(a * 5)) * Math.cos(a * 13 - rr * 4);
        const collar = 0.38 * Math.exp(-((rr - 0.3) ** 2) / 0.012);
        const limbus = rr > 0.8 ? (rr - 0.8) / 0.2 : 0;
        v = (0.26 + 0.46 * fibre * (1 - 0.45 * rr) + collar) * (1 - 0.8 * limbus);
        if (rr < 0.07) v = Math.max(v, 0.9);
      } else v = 0.34 * (1 - 0.6 * u * u) * (0.5 + 0.5 * Math.min(1, (y - top) / (EH * 0.18))); // white of the eye
      if (Math.hypot(x - (p.x - p.ri * 0.34), y - (p.y - p.ri * 0.36)) < p.ri * 0.14) v = 1; // glint
      return Math.max(v, rim);
    }

    function step(now: number, dt: number) {
      const r = canvas.getBoundingClientRect();
      const ex = r.left + cx, ey = r.top + cy;
      const hunting = fine && !!pointer && now - pointer.at < 2500;
      const asleep = fine && !playing && now - lastInput > SLEEP_AFTER;
      if (!fine && now > saccade) { saccade = now + 1500 + Math.random() * 2000; st.tx = Math.random() * 1.6 - 0.8; st.ty = Math.random() * 1.4 - 0.7; }
      if (hunting) { st.tx = clamp((pointer!.x - ex) / 360, -1, 1); st.ty = clamp((pointer!.y - ey) / 260, -1, 1); }
      else if (fine) { st.tx = 0.25 * Math.sin(now / 2300); st.ty = 0.2 * Math.sin(now / 1700); }
      const far = hunting ? Math.hypot(pointer!.x - ex, pointer!.y - ey) / 2000 : 0;
      const k = reduce ? 1 : 1 - Math.exp(-dt * 9);
      st.gx = ease(st.gx, st.tx, k); st.gy = ease(st.gy, st.ty, k);
      st.iz = ease(st.iz, hot ? 0.9 : clamp(0.92 + far, 0.92, 1.15), k);
      st.dil = ease(st.dil, hot ? 0.25 : 0.5 + 0.2 * Math.sin(now / 1430) + level * 0.4, k);
      st.open = ease(st.open, asleep ? 0 : now < squintUntil ? 0.45 : 1, reduce ? 1 : 1 - Math.exp(-dt * 7));
      st.spin += reduce ? 0 : dt * (hot ? 0.5 : 0.12);
      if (!reduce && !asleep && now > nextBlink) { blinkAt = now; nextBlink = now + 2600 + Math.random() * 3800; }
      const blink = now - blinkAt < 170 ? Math.sin(((now - blinkAt) / 170) * Math.PI) : 0;
      return { open: st.open * (1 - 0.96 * blink), asleep, hunting, r };
    }

    let lastKey = "";
    function draw(now: number, dt: number) {
      const { open, asleep, hunting, r } = step(now, dt);
      const scroll = reduce ? 0 : Math.floor((now - born) / 420);
      const p = pupil();
      // skip the frame entirely when nothing visible changed
      const key = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.ri.toFixed(1)},${p.rp.toFixed(1)},${open.toFixed(3)},${Math.round(st.spin / 0.04)},${scroll},${hunting ? pointer!.x + "," + pointer!.y + "," + r.top : 0},${asleep},${targetLabel}`;
      if (key === lastKey && !dirty) return;
      lastKey = key; dirty = false;

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      if (open < 0.002) { svg.style.opacity = "0"; return; }
      for (let row = 0; row < rows; row++)
        for (let c = 0; c < cols; c++) {
          const v = sample((c + 0.5) * CW, (row + 0.5) * CH, p, open);
          levels[row * cols + c] = v < 0 ? -1 : Math.round(clamp((v - 0.04) / 0.9, 0, 1) ** 1.2 * LEVELS);
        }
      // stamp glyphs from the atlas, grouped by brightness so alpha changes only 13 times
      for (let lv = 1; lv <= LEVELS; lv++) {
        const s = lv / LEVELS, sy = s > 0.55 ? slotH : 0;
        g.globalAlpha = 0.05 + 0.95 * s;
        for (let row = 0; row < rows; row++) {
          const from = offset + (row + scroll) * cols, dy = Math.round(row * CH * dpr), base = row * cols;
          for (let c = 0; c < cols; c++) {
            if (levels[base + c] !== lv) continue;
            const code = codes[(from + c) % codes.length];
            if (code === 0) continue; // space
            g.drawImage(atlas, code * slotW, sy, slotW, slotH, Math.round(c * CW * dpr) - 1, dy, slotW, slotH);
          }
        }
      }
      g.globalAlpha = 1;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      const vis = clamp((open - 0.6) / 0.3, 0, 1);
      if (vis <= 0) { svg.style.opacity = "0"; return; }
      // square tracking box around the pupil
      const s = p.rp + 4;
      g.lineWidth = 0.75;
      g.strokeStyle = `rgba(${ink},${0.7 * vis})`;
      g.strokeRect(Math.round(p.x - s) + 0.5, Math.round(p.y - s) + 0.5, Math.round(2 * s), Math.round(2 * s));
      // readout, centered under the eye, with a faint leader line
      g.font = `8px ${family}`;
      g.textBaseline = "alphabetic";
      const area = ((Math.PI * p.rp * p.rp) / (W * EH)).toFixed(10);
      const label = [`['pupil:u'] ${(p.x / W).toFixed(7)}`, (p.y / EH).toFixed(7), area, asleep ? "None" : targetLabel];
      const lw = Math.max(...label.map((t) => g.measureText(t).width));
      const lx = clamp(cx - lw / 2, 2, W - lw - 2), ly = EH + 10;
      g.fillStyle = `rgba(${ink},${0.86 * vis})`;
      label.forEach((t, i) => g.fillText(t, Math.round(lx), Math.round(ly) + i * 9 + 6.3));
      g.strokeStyle = `rgba(${ink},${0.22 * vis})`;
      g.beginPath(); g.moveTo(p.x, p.y + s); g.lineTo(lx + lw / 2, ly - 2); g.stroke();

      // dashed sight line from the pupil to a small box at the cursor
      if (hunting && !asleep) {
        const sx = r.left + p.x, sy = r.top + p.y, tx = pointer!.x, ty = pointer!.y;
        const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1;
        const cut = Math.min(dx ? (11 * len) / Math.abs(dx) : Infinity, dy ? (7 * len) / Math.abs(dy) : Infinity, len);
        sLine.setAttribute("x1", String(sx)); sLine.setAttribute("y1", String(sy));
        sLine.setAttribute("x2", String(tx - (dx / len) * cut)); sLine.setAttribute("y2", String(ty - (dy / len) * cut));
        sLine.setAttribute("stroke", `rgba(${red},${0.5 * vis})`);
        sRect.setAttribute("x", String(Math.round(tx - 11) + 0.5)); sRect.setAttribute("y", String(Math.round(ty - 7) + 0.5));
        sRect.setAttribute("stroke", `rgba(${ink},${0.45 * vis})`);
        svg.style.opacity = "1";
      } else svg.style.opacity = "0";
    }

    function tick(now: number) {
      raf = 0;
      if (disposed || !visible || document.hidden) { last = 0; return; }
      const dt = last ? clamp((now - last) / 1000, 0, 0.1) : 1 / 60;
      last = now;
      draw(now, dt);
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf && !disposed && visible) raf = requestAnimationFrame(tick); }

    readColors();
    setup();
    document.fonts.ready.then(() => {
      if (disposed) return;
      family = getComputedStyle(canvas).fontFamily || "monospace";
      ready = true;
      buildAtlas();
      born = performance.now();
      start();
    });
    const onVis = () => { if (!document.hidden) start(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true; svg.style.opacity = "0";
      cancelAnimationFrame(raf); io.disconnect(); themeObs.disconnect(); offL(); offP();
      removeEventListener("pointermove", onMove); removeEventListener("pointerdown", onDown);
      removeEventListener("scroll", wake); removeEventListener("keydown", wake);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [size]);

  return (
    <>
      <canvas ref={cvs} className="ascii-canvas font-mono" aria-hidden="true" />
      <svg ref={line} className="sightline" aria-hidden="true" />
    </>
  );
}

// Wide screens: the eye lives in the left margin and stays put while you scroll.
// Narrow screens: it sits at the top of the page as Fig. 1.
const WIDE = "(min-width: 1360px)";
const subWide = (cb: () => void) => { const m = matchMedia(WIDE); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useWide = () => useSyncExternalStore(subWide, () => matchMedia(WIDE).matches, () => null);

export function EyeAside() {
  const wide = useWide();
  if (!wide) return null;
  return (
    <aside className="eye-aside" aria-label="The eye">
      <Eye size={230} />
    </aside>
  );
}

export function EyeHero() {
  const wide = useWide();
  if (wide !== false) return null;
  return (
    <section className="row" aria-label="The eye">
      <div className="frame eye-hero">
        <Eye size={230} />
        <span className="fig-cap mono">Fig. 1.</span>
      </div>
    </section>
  );
}
