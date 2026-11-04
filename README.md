# jomariexe

Personal portfolio of Jomarie Esguerra, full-stack developer from Manila.

Built with Next.js, React, TypeScript and Tailwind CSS. Features an ASCII eye that follows your cursor, a working Walkman with original chiptune tracks, and a GitHub activity heatmap pulled in at build time.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` – local dev server
- `npm run build` – production build
- `npm run lint` – lint
- `node scripts/compose-tracks.mjs` – re-render the music in `public/audio/`

## Where things live

- `src/content/site.ts` – all copy, experience, projects and tracks
- `src/app/page.tsx` – the page
- `src/components/` – eye, Walkman, heatmap, header, icons
- `src/lib/` – GitHub data, UI sounds
