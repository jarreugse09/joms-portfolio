// Cassette window: two spools whose tape packs trade size as the song plays.

export type Reels = { p: number; aL: number; aR: number };

/** Pack radius for a fraction of the tape; keeps the tape's area, like a real spool. */
export function geometry(W: number, H: number) {
  const R = H * 0.47, hub = H * 0.2;
  return { R, hub, pack: (f: number) => Math.sqrt(hub * hub * 1.3 + (R * R - hub * hub * 1.3) * f) };
}

function spool(c: CanvasRenderingContext2D, x: number, y: number, pack: number, hub: number, ang: number) {
  c.fillStyle = "#3a2c22"; c.beginPath(); c.arc(x, y, pack, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#7b6450"; c.globalAlpha = 0.3; c.lineWidth = 0.6;
  for (let r = hub + 2.5; r < pack - 1; r += 2.6) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
  c.globalAlpha = 0.9; c.lineWidth = 1.3;
  if (pack > hub + 3) { c.beginPath(); c.arc(x, y, pack - 1.4, ang, ang + 0.6); c.stroke(); }
  c.globalAlpha = 1;
  c.fillStyle = "#eceef1"; c.beginPath(); c.arc(x, y, hub, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#9aa0ab"; c.lineWidth = 0.8; c.beginPath(); c.arc(x, y, hub - 1.2, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "#141518"; c.beginPath(); c.arc(x, y, hub * 0.55, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#eceef1";
  for (let k = 0; k < 6; k++) { c.save(); c.translate(x, y); c.rotate(ang + (k * Math.PI) / 3); c.fillRect(-0.9, -hub * 0.56, 1.8, hub * 0.24); c.restore(); }
}

export function drawReels(cv: HTMLCanvasElement, st: Reels) {
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  const { hub, pack } = geometry(W, H), cy = H / 2;
  spool(c, W * 0.2, cy, pack(1 - st.p), hub, st.aL);
  spool(c, W * 0.8, cy, pack(st.p), hub, st.aR);
  // centre viewing window with a tape-length scale
  const x0 = W * 0.38, x1 = W * 0.62;
  c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1; c.strokeRect(x0, H * 0.22, x1 - x0, H * 0.56);
  c.fillStyle = "rgba(255,255,255,.55)";
  for (let k = 0; k <= 4; k++) c.fillRect(x0 + 4 + ((x1 - x0 - 8) * k) / 4, H * 0.22, 0.8, k % 2 ? 2.5 : 4);
}
