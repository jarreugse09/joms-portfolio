import {
  siCss, siExpress, siFacebook, siFlask, siGit, siGithub, siGmail, siGooglegemini, siHtml5, siInstagram,
  siJavascript, siLinux, siMongodb, siMysql, siNextdotjs, siNodedotjs, siPython, siReact, siRender,
  siTailwindcss, siTypescript, siVercel, siYolo,
} from "simple-icons";

type Icon = { title: string; path: string; hex: string };

// LinkedIn's mark is not in simple-icons; this is a plain "in" glyph.
const linkedin: Icon = {
  title: "LinkedIn",
  hex: "0A66C2",
  path: "M3 3h18v18H3V3zm4.2 6.9H5.4V18h1.8V9.9zM6.3 5.6a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1zM18.6 13.1c0-2.2-1.2-3.4-2.9-3.4-1.2 0-1.9.6-2.2 1.2V9.9h-1.8V18h1.8v-4.3c0-1.1.5-1.9 1.5-1.9s1.6.7 1.6 1.9V18h2v-4.9z",
};

// No brand mark for SMTP: a plain envelope (outer box with two cut-outs).
const smtp: Icon = { title: "SMTP", hex: "8A8A93", path: "M2 5H22V19H2ZM4 9.2V17H20V9.2L12 14.2ZM4 7V7.4L12 12.4L20 7.4V7Z" };

const MAP: Record<string, Icon> = {
  SMTP: smtp,
  TypeScript: siTypescript, JavaScript: siJavascript, React: siReact, "Next.js": siNextdotjs,
  "Tailwind CSS": siTailwindcss, HTML: siHtml5, CSS: siCss, "Node.js": siNodedotjs, Express: siExpress,
  MongoDB: siMongodb, MySQL: siMysql, Python: siPython, Flask: siFlask, YOLO: siYolo, "Gemini AI": siGooglegemini,
  Git: siGit, Linux: siLinux, Vercel: siVercel, Render: siRender,
  GitHub: siGithub, LinkedIn: linkedin, Facebook: siFacebook, Instagram: siInstagram, Email: siGmail,
};

/** Brand colors that disappear on one of the themes render in the text color instead. */
function tone(hex: string) {
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.18 || lum > 0.85 ? "currentColor" : `#${hex}`;
}

export default function TechIcon({ name, size = 16, mono = false, label = false }: { name: string; size?: number; mono?: boolean; label?: boolean }) {
  const icon = MAP[name];
  if (!icon) return label ? <span className="text-[13px]">{name}</span> : null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={mono ? "currentColor" : tone(icon.hex)} role={label ? "img" : undefined} aria-label={label ? name : undefined} aria-hidden={label ? undefined : true}>
      {label && <title>{name}</title>}
      <path d={icon.path} />
    </svg>
  );
}

/** A row of stack icons with an accessible name per icon and a hover tooltip. */
export function IconRow({ items, size = 16 }: { items: readonly string[]; size?: number }) {
  return (
    <ul className="icon-row" aria-label="Built with">
      {items.map((n) => (
        <li key={n} className="tip" data-tip={n}>
          <TechIcon name={n} size={size} label />
        </li>
      ))}
    </ul>
  );
}
