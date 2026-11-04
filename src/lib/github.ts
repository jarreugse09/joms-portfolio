import { cacheLife } from "next/cache";

export type Day = { date: string; count: number; level: number };
export type Year = { year: number; total: number; days: Day[] };

const USER = "jarreugse09";
const FIRST_YEAR = 2022; // account created Sept 2022

/** Public GitHub contribution calendar, parsed from github.com at build time and refreshed daily. */
export async function getContributions(): Promise<Year[]> {
  "use cache";
  cacheLife("days");
  const now = new Date().getFullYear();
  const years: Year[] = [];
  for (let y = now; y >= FIRST_YEAR; y--) {
    try {
      const res = await fetch(`https://github.com/users/${USER}/contributions?from=${y}-01-01&to=${y}-12-31`, {
        headers: { "User-Agent": "jomariexe-portfolio" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const counts = new Map<string, number>();
      for (const m of html.matchAll(/for="(contribution-day-component-[\d-]+)"[^>]*>([^<]+)</g)) {
        const n = /^(\d+) contribution/.exec(m[2].trim());
        counts.set(m[1], n ? Number(n[1]) : 0);
      }
      const days: Day[] = [];
      for (const m of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"\s+id="(contribution-day-component-[\d-]+)"\s+data-level="(\d)"/g)) {
        days.push({ date: m[1], level: Number(m[3]), count: counts.get(m[2]) ?? 0 });
      }
      days.sort((a, b) => a.date.localeCompare(b.date));
      years.push({ year: y, total: days.reduce((s, d) => s + d.count, 0), days });
    } catch {}
  }
  return years;
}
