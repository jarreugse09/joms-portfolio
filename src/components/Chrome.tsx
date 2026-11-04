"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { installSfx, onSound, play, setSound, soundOn } from "@/lib/sfx";

const NAV = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];

function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, () => document.documentElement.dataset.theme ?? "dark", () => null);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("jx-theme", next);
    play("toggle");
  };
  return (
    <button type="button" className="icon-btn" onClick={flip} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
      </svg>
    </button>
  );
}

function SoundToggle() {
  const on = useSyncExternalStore(onSound, soundOn, () => true);
  return (
    <button type="button" className="icon-btn" onClick={() => { setSound(!on); if (!on) setTimeout(() => play("toggle"), 0); }} aria-pressed={on} aria-label={on ? "Mute interface sounds" : "Turn on interface sounds"}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" fill="currentColor" stroke="none" />
        {on ? <><path d="M10.5 5.5a3.5 3.5 0 0 1 0 5" strokeLinecap="round" /><path d="M12.5 3.5a6.3 6.3 0 0 1 0 9" strokeLinecap="round" /></> : <path d="M10.5 6l4 4m0-4l-4 4" strokeLinecap="round" />}
      </svg>
    </button>
  );
}

export function Header() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => installSfx(), []);
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <header className="site-head">
      <div className="frame head-inner">
        <a href="#top" className="brand" aria-label="Jomarie Esguerra, back to top">
          jomariexe<span className="brand-dot" aria-hidden="true" />
        </a>
        <nav className="nav" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} aria-current={active === n.id ? "true" : undefined}>{n.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

const NS = "jomariexe-me";
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n.toLocaleString() + (s[(v - 20) % 10] || s[v] || s[0]);
};

let visits: Promise<number | null> | null = null;
function getVisits() {
  if (visits) return visits;
  const counted = sessionStorage.getItem("jx-counted");
  visits = fetch(`https://abacus.jasoncameron.dev/${counted ? "get" : "hit"}/${NS}/visits`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (typeof j?.value !== "number") return null;
      sessionStorage.setItem("jx-counted", "1");
      return j.value as number;
    })
    .catch(() => null);
  return visits;
}

/** Counts each browser session once via a free public counter (abacus). Hidden if the service is down. */
export function Visitors() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    getVisits().then((v) => live && setN(v));
    return () => { live = false; };
  }, []);
  if (n === null) return null;
  return <span className="visit-pill" title={`You are the ${ordinal(n)} visitor`}>{n.toLocaleString()} visits</span>;
}
