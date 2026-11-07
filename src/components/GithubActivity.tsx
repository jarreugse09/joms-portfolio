"use client";

import { useEffect, useRef, useState } from "react";
import type { Year } from "@/lib/github";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function GithubActivity({ years, user }: { years: Year[]; user: string }) {
  const [sel, setSel] = useState(years[0]?.year);
  const y = years.find((v) => v.year === sel);
  const scroller = useRef<HTMLDivElement>(null);
  // on narrow screens start scrolled to the newest week
  useEffect(() => { const el = scroller.current; if (el) el.scrollLeft = el.scrollWidth; }, [sel]);
  if (!y) return <p className="cap">GitHub activity is unavailable right now.</p>;

  // place days in week columns (Sunday first), padding the first week
  const first = new Date(y.days[0]?.date + "T00:00:00Z").getUTCDay();
  const cells: (Year["days"][number] | null)[] = [...Array(first).fill(null), ...y.days];
  const weeks = Math.ceil(cells.length / 7);
  const monthAt: { m: number; w: number }[] = [];
  y.days.forEach((d, i) => {
    const day = Number(d.date.slice(8, 10));
    if (day === 1) monthAt.push({ m: Number(d.date.slice(5, 7)) - 1, w: Math.floor((i + first) / 7) });
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="mono-label"># activity</span>
        <div className="flex items-center gap-1 font-mono text-[12px]" role="group" aria-label="Year">
          {years.map((v, i) => (
            <span key={v.year} className="flex items-center">
              {i > 0 && <span className="text-faint px-1">/</span>}
              <button
                type="button"
                aria-pressed={v.year === sel}
                className={v.year === sel ? "text-ink font-semibold" : "text-faint hover:text-ink"}
                onClick={() => setSel(v.year)}
              >
                {v.label ?? v.year}
              </button>
            </span>
          ))}
          <a className="ml-3 text-ink link" href={`https://github.com/${user}`} target="_blank" rel="noopener noreferrer">github</a>
        </div>
      </div>

      <div className="gh-scroll mt-4" ref={scroller}>
        <div className="gh" style={{ gridTemplateColumns: `repeat(${weeks}, var(--gh-cell))` }}>
          {monthAt.map(({ m, w }) => (
            <span key={w} className="gh-month" style={{ gridColumn: `${w + 1} / span 4` }}>{MONTHS[m]}</span>
          ))}
          {cells.map((d, i) =>
            d ? (
              <span
                key={d.date}
                className="gh-day"
                data-l={d.level}
                style={{ gridColumn: Math.floor(i / 7) + 1, gridRow: (i % 7) + 2 }}
                title={`${d.count} contribution${d.count === 1 ? "" : "s"} on ${d.date}`}
              />
            ) : null,
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
        <span><b className="text-ink font-semibold">{y.total.toLocaleString()}</b> contributions · {y.label ?? y.year}</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          less {[0, 1, 2, 3, 4].map((l) => <span key={l} className="gh-day gh-legend" data-l={l} />)} more
        </span>
      </div>
    </div>
  );
}
