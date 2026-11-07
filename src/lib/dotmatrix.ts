// Dot-matrix LCD for the walkman: every pixel on the screen is a cell on one grid.
// Levels: 0 off · 1 dim · 2 on · 3 ghost (unlit label) · 5 cut-out (text inside a lit bar).

const F5: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001", B: "11110 10001 10001 11110 10001 10001 11110", C: "01110 10001 10000 10000 10000 10001 01110",
  D: "11110 10001 10001 10001 10001 10001 11110", E: "11111 10000 10000 11110 10000 10000 11111", F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01111", H: "10001 10001 10001 11111 10001 10001 10001", I: "01110 00100 00100 00100 00100 00100 01110",
  J: "00111 00010 00010 00010 00010 10010 01100", K: "10001 10010 10100 11000 10100 10010 10001", L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001", N: "10001 10001 11001 10101 10011 10001 10001", O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000", Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100", U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100", W: "10001 10001 10001 10101 10101 10101 01010", X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100", Z: "11111 00001 00010 00100 01000 10000 11111",
  0: "01110 10001 10011 10101 11001 10001 01110", 1: "00100 01100 00100 00100 00100 00100 01110", 2: "01110 10001 00001 00010 00100 01000 11111",
  3: "11111 00010 00100 00010 00001 10001 01110", 4: "00010 00110 01010 10010 11111 00010 00010", 5: "11111 10000 11110 00001 00001 10001 01110",
  6: "00110 01000 10000 11110 10001 10001 01110", 7: "11111 00001 00010 00100 01000 01000 01000", 8: "01110 10001 10001 01110 10001 10001 01110",
  9: "01110 10001 10001 01111 00001 00010 01100",
  " ": "00000 00000 00000 00000 00000 00000 00000", "-": "00000 00000 00000 11111 00000 00000 00000", ".": "00000 00000 00000 00000 00000 01100 01100",
  "'": "00100 00100 01000 00000 00000 00000 00000", "&": "01100 10010 10100 01000 10101 10010 01101", ",": "00000 00000 00000 00000 01100 00100 01000",
  "!": "00100 00100 00100 00100 00100 00000 00100", "+": "00000 00100 00100 11111 00100 00100 00000", "?": "01110 10001 00001 00010 00100 00000 00100",
  ":": "00000 01100 01100 00000 01100 01100 00000", "/": "00001 00010 00010 00100 01000 01000 10000", "%": "11001 11010 00010 00100 01000 01011 10011",
  "(": "00010 00100 01000 01000 01000 00100 00010", ")": "01000 00100 00010 00010 00010 00100 01000",
};
const F3: Record<string, string> = {
  A: "010 101 111 101 101", B: "110 101 110 101 110", C: "011 100 100 100 011", D: "110 101 101 101 110", E: "111 100 110 100 111", F: "111 100 110 100 100",
  G: "011 100 101 101 011", H: "101 101 111 101 101", I: "111 010 010 010 111", J: "001 001 001 101 010", K: "101 101 110 101 101", L: "100 100 100 100 111",
  M: "101 111 111 101 101", N: "110 101 101 101 101", O: "010 101 101 101 010", P: "110 101 110 100 100", Q: "010 101 101 110 011", R: "110 101 110 101 101",
  S: "011 100 010 001 110", T: "111 010 010 010 010", U: "101 101 101 101 111", V: "101 101 101 101 010", W: "101 101 111 111 101", X: "101 101 010 101 101",
  Y: "101 101 010 010 010", Z: "111 001 010 100 111",
  0: "111 101 101 101 111", 1: "010 110 010 010 111", 2: "110 001 010 100 111", 3: "110 001 010 001 110", 4: "101 101 111 001 001",
  5: "111 100 110 001 110", 6: "011 100 111 101 111", 7: "111 001 010 010 010", 8: "111 101 111 101 111", 9: "111 101 111 001 110",
  " ": "000 000 000 000 000", "/": "001 001 010 100 100", "%": "101 001 010 100 101", ":": "000 010 000 010 000", "-": "000 000 111 000 000",
  ".": "000 000 000 000 010", ",": "000 000 000 010 100", "!": "010 010 010 000 010", "'": "010 010 000 000 000", "+": "000 010 111 010 000",
  "(": "010 100 100 100 010", ")": "010 001 001 001 010",
};
type Font = { w: number; h: number; g: Record<string, string> };
const FONT5: Font = { w: 5, h: 7, g: F5 }, FONT3: Font = { w: 3, h: 5, g: F3 };
const ICON = {
  play: ["100", "110", "111", "110", "100"], pause: ["101", "101", "101", "101", "101"], spk: ["001", "011", "111", "011", "001"],
  batt: ["11111110", "10101011", "10101011", "10101011", "11111110"],
};

export const PITCH = 2.5;
const CELL = 2, ROWS = 57, PX = 4, PY = 4, COVER = 30, TX = 33;
const ROW = { status: 0, title: 8, artist: 24, album: 33, prog: 43, time: 50 };
export const LIST = { top: 15, vis: 3, step: 9 };

export type ScreenView = "main" | "list" | "volume" | "out" | "reading";
export type ScreenState = {
  view: ScreenView; playing: boolean; index: number; count: number; rpt: boolean; shf: boolean; volume: number;
  title: string; artist: string; album: string; short: string; t: number; d: number; titles: string[]; listTop: number;
  cover: Uint8Array | null; level: number; readFrac: number;
};
export type Colors = { ink: string; cell: string; dim: string; ghost: string; shadow: string };

const fmt = (s: number) => { s = Math.max(0, Number.isFinite(s) ? s : 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };
const textW = (str: string, f: Font, sc = 1) => (str.length ? (str.length * (f.w + 1) - 1) * sc : 0);

/** Turn a loaded cover image into COVER×COVER cells: dark = on, mid-tones = dim (ordered dither). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function ditherCover(img: HTMLImageElement): Uint8Array | null {
  try {
    const c = document.createElement("canvas"); c.width = c.height = COVER;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0, COVER, COVER);
    const px = g.getImageData(0, 0, COVER, COVER).data, out = new Uint8Array(COVER * COVER);
    for (let i = 0; i < COVER * COVER; i++) {
      const lum = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) / 255;
      const x = i % COVER, y = (i / COVER) | 0, th = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
      out[i] = lum < th * 0.85 ? 2 : lum < th * 0.85 + 0.28 ? 1 : 0;
    }
    return out;
  } catch {
    return null; // image without CORS: leave the cover area blank
  }
}

export function createScreen(canvas: HTMLCanvasElement) {
  let tcols = 0, trows = 0, cols = 0, grid = new Uint8Array(0), ox = 0;
  const oy = (PITCH - CELL) / 2 + 0.5;
  const tick: Record<string, { key: string; off: number; last: number; hold: number }> = {};

  const size = () => {
    tcols = Math.floor(canvas.clientWidth / PITCH); trows = ROWS + PY * 2; cols = tcols - PX * 2;
    canvas.style.height = trows * PITCH + (PITCH - CELL) + "px";
    grid = new Uint8Array(tcols * trows);
  };
  const set = (c: number, r: number, v: number) => { if (c >= 0 && c < cols && r >= 0 && r < ROWS) grid[(r + PY) * tcols + c + PX] = v; };
  const box = (x: number, y: number, w: number, h: number, v: number) => { for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) set(c, r, v); };
  const icon = (rows: string[], x: number, y: number, v = 2) => rows.forEach((row, ry) => [...row].forEach((b, rx) => { if (b === "1") set(x + rx, y + ry, v); }));
  const mid = (s: string, f: Font, sc = 1) => Math.floor((cols - textW(s, f, sc)) / 2);
  function put(str: string, x: number, y: number, f: Font, sc = 1, v = 2, x0 = 0, x1 = cols) {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const g = (f.g[ch] ?? f.g[" "]).split(" ");
      for (let gy = 0; gy < f.h; gy++) for (let gx = 0; gx < f.w; gx++) {
        if (g[gy][gx] !== "1") continue;
        for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const c = cx + gx * sc + a; if (c >= x0 && c < x1) set(c, y + gy * sc + b, v); }
      }
      cx += (f.w + 1) * sc;
    }
    return cx - x;
  }
  // text that scrolls one cell at a time when it does not fit, pausing at the start
  function ticker(id: string, text: string, x0: number, y: number, sc: number, v: number, x1: number, now: number, still: boolean) {
    const t = (tick[id] ??= { key: "", off: 0, last: 0, hold: 0 });
    if (t.key !== text) { t.key = text; t.off = 0; t.hold = now + 1600; }
    const tw = textW(text, FONT5, sc), gap = 12 * sc;
    if (tw <= x1 - x0) { put(text, x0, y, FONT5, sc, v, x0, x1); return; }
    if (!still && now > t.hold && now - t.last > (sc > 1 ? 70 : 90)) { t.off++; t.last = now; if (t.off >= tw + gap) { t.off = 0; t.hold = now + 1600; } }
    put(text, x0 - t.off, y, FONT5, sc, v, x0, x1);
    put(text, x0 - t.off + tw + gap, y, FONT5, sc, v, x0, x1);
  }

  function draw(s: ScreenState, colors: Colors, now: number, still: boolean) {
    if (!canvas.clientWidth) return;
    if (tcols !== Math.floor(canvas.clientWidth / PITCH)) size();
    grid.fill(0);
    const N = cols;
    if (s.view === "out") {
      const v = Math.floor(now / 500) % 2 ? 1 : 2;
      put("CARD", mid("CARD", FONT5, 2), 10, FONT5, 2, v);
      put("OUT", mid("OUT", FONT5, 2), 27, FONT5, 2, v);
      put("PICK A CARD", mid("PICK A CARD", FONT3), 48, FONT3, 1, 1);
    } else if (s.view === "reading") {
      put("READING SD", mid("READING SD", FONT5), 12, FONT5);
      const bw = N - 16, fill = Math.round(s.readFrac * bw);
      for (let c = 0; c < bw; c++) { if (c < fill) box(8 + c, 26, 1, 3, 2); else set(8 + c, 27, 1); }
      put(s.short, mid(s.short, FONT5), 38, FONT5, 1, 1);
    } else {
      icon(s.playing ? ICON.pause : ICON.play, 0, ROW.status);
      const count = `${String(s.index + 1).padStart(2, "0")}/${String(s.count).padStart(2, "0")}`;
      let x = 6 + put(count, 6, ROW.status, FONT3) + 6;
      x += put("RPT", x, ROW.status, FONT3, 1, s.rpt ? 2 : 3) + 3;
      x += put("SHF", x, ROW.status, FONT3, 1, s.shf ? 2 : 3) + 3;
      put("PRV", x, ROW.status, FONT3, 1, 1);
      icon(ICON.batt, N - 8, ROW.status);
      const vol = `${s.volume * 10}%`, vx = N - 11 - textW(vol, FONT3);
      put(vol, vx, ROW.status, FONT3);
      icon(ICON.spk, vx - 5, ROW.status);

      if (s.view === "volume") {
        put("VOLUME", 0, 12, FONT5);
        const pct = s.volume * 10 + "%";
        put(pct, N - textW(pct, FONT5, 2), ROW.title, FONT5, 2);
        const bw = Math.floor((N - 9) / 10);
        for (let k = 0; k < 10; k++) box(k * (bw + 1), 28, bw, 7, k < s.volume ? 2 : 3);
      } else if (s.view === "list") {
        put(`${s.short} - ${s.count} SONGS`, 0, ROW.title, FONT3, 1, 1);
        const n = s.titles.length, rows = LIST.vis * LIST.step - 1, x1 = n > LIST.vis ? N - 4 : N;
        s.titles.slice(s.listTop, s.listTop + LIST.vis).forEach((title, k) => {
          const i = s.listTop + k, y = LIST.top + k * LIST.step, txt = `${String(i + 1).padStart(2, "0")} ${title}`;
          if (i === s.index) { box(0, y - 1, x1, 9, 2); ticker("li", txt, 2, y, 1, 5, x1 - 1, now, still); } else put(txt, 2, y, FONT5, 1, 2, 0, x1 - 1);
        });
        if (n > LIST.vis) {
          const th = Math.max(4, Math.round((rows * LIST.vis) / n)), ty = Math.round(((rows - th) * s.listTop) / (n - LIST.vis));
          box(N - 2, LIST.top - 1, 2, rows + 1, 3);
          box(N - 2, LIST.top - 1 + ty, 2, th, 2);
        }
      } else {
        if (s.cover) for (let r = 0; r < COVER; r++) for (let c = 0; c < COVER; c++) { const v = s.cover[r * COVER + c]; if (v) set(c, ROW.title + r, v); }
        ticker("t", s.title, TX, ROW.title, 2, 2, N, now, still);
        ticker("a", s.artist, TX, ROW.artist, 1, 2, N, now, still);
        ticker("l", s.album, TX, ROW.album, 1, 1, N - 24, now, still);
        const lit = Math.round(s.level * 11);
        for (let k = 0; k < 11; k++) set(N - 21 + k * 2, ROW.album + 6, k < lit ? 2 : 1);
      }
      // progress: 1 cell thick ahead, 3 cells thick behind, a 2×5 block at the playhead
      const fill = Math.round((s.d ? s.t / s.d : 0) * (N - 2));
      for (let c = 0; c < N; c++) { if (c < fill) box(c, ROW.prog + 1, 1, 3, 2); else set(c, ROW.prog + 2, 1); }
      box(fill, ROW.prog, 2, 5, 2);
      put(fmt(s.t), 0, ROW.time, FONT5);
      const rem = "-" + fmt(s.d - s.t);
      put(rem, N - textW(rem, FONT5), ROW.time, FONT5, 1, 1);
    }
    paint(colors);
  }

  function paint(col: Colors) {
    const dpr = devicePixelRatio || 1, W = canvas.clientWidth, H = trows * PITCH + (PITCH - CELL);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    const g = canvas.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    ox = Math.round(((W - (tcols * PITCH - (PITCH - CELL))) / 2) * 2) / 2;
    const p = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()]; // off, dim, on, ghost, shadow, cut-out
    for (let r = 0; r < trows; r++) for (let c = 0; c < tcols; c++) {
      const v = grid[r * tcols + c], x = ox + c * PITCH, y = oy + r * PITCH;
      p[v].rect(x, y, CELL, CELL);
      // LCD ghosting: an unlit cell just below-right of a lit one gets a soft shadow
      if (v !== 2 && v !== 5 && r > 0 && c > 0 && grid[(r - 1) * tcols + c - 1] === 2) p[4].rect(x, y, CELL, CELL);
    }
    ([[0, col.cell], [5, col.cell], [3, col.ghost], [4, col.shadow], [1, col.dim], [2, col.ink]] as const).forEach(([k, c]) => { g.fillStyle = c; g.fill(p[k]); });
  }

  /** Map a pointer position to content cell coordinates (row, col) and the zone it falls in. */
  function hit(clientX: number, clientY: number) {
    const r = canvas.getBoundingClientRect();
    const col = Math.floor((clientX - r.left - ox) / PITCH) - PX, row = Math.floor((clientY - r.top - oy) / PITCH) - PY;
    const zone = row >= ROW.prog - 1 && row <= ROW.prog + 5 ? "seek" : row >= LIST.top - 1 && row < LIST.top - 1 + LIST.vis * LIST.step ? "list" : null;
    return { row, col, cols, zone, listRow: Math.floor((row - LIST.top + 1) / LIST.step) };
  }

  return { draw, hit, reset: () => (tcols = 0) };
}
