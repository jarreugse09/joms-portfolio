"use client";

import { useState, type ReactNode } from "react";

const GridIc = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" aria-hidden="true"><rect x="1.5" y="1.5" width="4.5" height="4.5" /><rect x="8" y="1.5" width="4.5" height="4.5" /><rect x="1.5" y="8" width="4.5" height="4.5" /><rect x="8" y="8" width="4.5" height="4.5" /></svg>
);
const ListIc = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" aria-hidden="true"><rect x="1.5" y="2" width="3" height="3" /><path d="M7 3.5h5.5" /><rect x="1.5" y="9" width="3" height="3" /><path d="M7 10.5h5.5" /></svg>
);

// Grid (two per row, big shots) or list (one per row, small thumbnails).
export function ProjectsView({ link, children }: { link: ReactNode; children: ReactNode }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4">
        <h2 className="h2">Projects</h2>
        <div className="flex items-center gap-4">
          {link}
          <div className="view-toggle" role="group" aria-label="Project layout">
            <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => setView("grid")}><GridIc /></button>
            <button type="button" aria-pressed={view === "list"} aria-label="List view" onClick={() => setView("list")}><ListIc /></button>
          </div>
        </div>
      </div>
      <div className="proj-grid" data-view={view}>{children}</div>
    </>
  );
}
