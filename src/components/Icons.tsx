// Authored pixel icons, drawn on a 7x7 grid in currentColor.
const box = { viewBox: "0 0 7 7", width: 12, height: 12, shapeRendering: "crispEdges" as const, "aria-hidden": true };

export function Arrow() {
  return (
    <svg {...box} fill="currentColor">
      <rect x="2" y="0" width="5" height="1" /><rect x="6" y="1" width="1" height="4" />
      <rect x="4" y="2" width="1" height="1" /><rect x="3" y="3" width="1" height="1" />
      <rect x="2" y="4" width="1" height="1" /><rect x="1" y="5" width="1" height="1" /><rect x="0" y="6" width="1" height="1" />
      <rect x="5" y="1" width="1" height="1" />
    </svg>
  );
}

export function Mail() {
  return (
    <svg {...box} fill="currentColor">
      <rect x="0" y="1" width="7" height="1" /><rect x="0" y="5" width="7" height="1" />
      <rect x="0" y="1" width="1" height="5" /><rect x="6" y="1" width="1" height="5" />
      <rect x="1" y="2" width="1" height="1" /><rect x="5" y="2" width="1" height="1" />
      <rect x="2" y="3" width="3" height="1" />
    </svg>
  );
}
