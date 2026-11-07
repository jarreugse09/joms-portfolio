import { useId } from "react";

// SD card outline: notched corner, side notches, contacts at the end that goes into the slot.
const SHAPE = "M5 1 H46 L63 18 V30 H60 V38 H63 V80 A3 3 0 0 1 60 83 H4 A3 3 0 0 1 1 80 V36 H3.5 V22 H1 V5 A4 4 0 0 1 5 1 Z";
// the label area: the whole face above the contacts, cut along the card's top-right notch
const LABEL = "M6 5 H44.5 L59 19.5 V57 H6 Z";
const L = { x: 6, y: 5, w: 53, h: 52 };
const PADS = [[10, 66, 10], [19, 63, 14], [28, 63, 14], [37, 63, 14], [46, 66, 10]];

function hash(s: string) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 100003; return h || 1; }

/** Light wear: a few fine scratches and specks, the same every render for a given card. */
function wear(key: string) {
  let seed = hash(key);
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lines = Array.from({ length: 9 }, () => { const x = 4 + r() * 56, y = 3 + r() * 78, l = 3 + r() * 11, a = (r() - 0.5) * 1.4; return [x, y, x + Math.cos(a) * l, y + Math.sin(a) * l]; });
  const dots = Array.from({ length: 14 }, () => [3 + r() * 58, 3 + r() * 78, 0.2 + r() * 0.45]);
  return { lines, dots };
}

/** Cover art fills the label: one image, or a 2×2 grid when the card holds songs from four or more releases. */
function Covers({ arts }: { arts: string[] }) {
  if (arts.length >= 4) {
    const w = L.w / 2, h = L.h / 2;
    return <>{arts.slice(0, 4).map((src, k) => <image key={k} href={src} x={L.x + (k % 2) * w} y={L.y + Math.floor(k / 2) * h} width={w} height={h} preserveAspectRatio="xMidYMid slice" />)}</>;
  }
  return <image href={arts[0]} x={L.x} y={L.y} width={L.w} height={L.h} preserveAspectRatio="xMidYMid slice" />;
}

export default function SdCard({ name, seed, color, arts, width = 60 }: { name: string; seed: string; color: string; arts: string[]; width?: number }) {
  const id = useId().replace(/:/g, "");
  const { lines, dots } = wear(seed);
  return (
    <svg className="sdsvg" width={width} height={Math.round((width * 84) / 64)} viewBox="0 0 64 84" role="img" aria-label={name}>
      <defs>
        <clipPath id={`sd${id}`}><path d={SHAPE} /></clipPath>
        <clipPath id={`lb${id}`}><path d={LABEL} /></clipPath>
      </defs>
      <path d={SHAPE} fill="#1d1e22" />
      <g clipPath={`url(#sd${id})`}>
        <path d="M0 84 V60 H64 V84Z" fill="#000" opacity=".18" />
        <g clipPath={`url(#lb${id})`}>
          <path d={LABEL} fill={color} />
          <Covers arts={arts} />
          {/* worn label corner and a faint sheen across the sticker */}
          <path d="M6 57 V52 L11.5 57 Z" fill="#f4f5f7" opacity=".5" />
          <path d="M-4 60 L30 -2 H38 L4 60 Z" fill="#fff" opacity=".08" />
        </g>
        <path d={LABEL} fill="none" stroke="#000" strokeOpacity=".45" strokeWidth=".6" />
        <g fill="#c3c7cf" stroke="#000" strokeOpacity=".35" strokeWidth=".5">{PADS.map(([x, y, h]) => <rect key={x} x={x} y={y} width="7" height={h} rx="1.4" />)}</g>
        <g stroke="#fff" strokeOpacity=".28" strokeWidth=".35" strokeLinecap="round">{lines.map(([x1, y1, x2, y2], k) => <line key={k} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} />)}</g>
        <g fill="#fff" opacity=".28">{dots.map(([cx, cy, rr], k) => <circle key={k} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={rr.toFixed(2)} />)}</g>
      </g>
      <path d="M5.4 1.8 H45.6 L62.2 18.4" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth=".9" />
      <path d={SHAPE} fill="none" stroke="#000" strokeOpacity=".7" strokeWidth=".8" />
    </svg>
  );
}
