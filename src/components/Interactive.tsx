"use client";

import { useEffect, useState } from "react";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ anchors: { offset: -80 }, lerp: 0.12 });
    let raf = requestAnimationFrame(function loop(t) { lenis.raf(t); raf = requestAnimationFrame(loop); });
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
  return null;
}

export function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try { await navigator.clipboard.writeText(email); setState("copied"); }
    catch { setState("failed"); }
    setTimeout(() => setState("idle"), 1800);
  };
  return (
    <button type="button" className="btn" onClick={copy}>
      {state === "copied" ? "Copied to clipboard" : state === "failed" ? "Copy failed, select it above" : "Copy email"}
      <span className="sr-only" role="status">{state === "copied" ? "Email copied" : ""}</span>
    </button>
  );
}

export function LocalTime({ tz }: { tz: string }) {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    const f = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: tz });
    const tick = () => setT(f.format(new Date()));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [tz]);
  return <span className="tabular-nums">{t ?? "--:--"}</span>;
}

