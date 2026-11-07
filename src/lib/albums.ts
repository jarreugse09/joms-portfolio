import { cacheLife } from "next/cache";
import { albums as cards, type AlbumCard } from "@/content/site";

export type Song = { id: string; title: string; credit: string; artist: string; preview: string; url: string; art: string };
/** arts: the cover(s) for the SD card sticker; one for an album, up to four for a card of picks. */
export type Album = { key: string; name: string; short: string; hand: string; color: string; artist: string; url: string; art: string; arts: string[]; songs: Song[] };

type ITunes = { wrapperType: string; trackId?: number; trackName?: string; artistName: string; collectionName?: string; previewUrl?: string; trackViewUrl?: string; collectionViewUrl?: string; artworkUrl100?: string };

const API = "https://itunes.apple.com/lookup";
// some OPM releases are only in the Philippine store
const COUNTRIES = ["us", "ph"];
// keep screen titles short: "(feat. …)" stays in the credit only
const clean = (t: string) => t.replace(/\s*[([]feat\.[^)\]]*[)\]]/i, "").trim();
const big = (u = "") => u.replace("100x100bb", "300x300bb");

async function lookup(params: string, country: string): Promise<ITunes[]> {
  try {
    const res = await fetch(`${API}?${params}&country=${country}`);
    if (!res.ok) return [];
    return (await res.json()).results ?? [];
  } catch {
    return [];
  }
}

const toSong = (r: ITunes): Song => ({ id: String(r.trackId), title: clean(r.trackName!), credit: r.trackName!, artist: r.artistName, preview: r.previewUrl!, url: r.trackViewUrl ?? "", art: big(r.artworkUrl100) });
const playable = (r: ITunes) => r.wrapperType === "track" && !!r.previewUrl;

async function load(card: AlbumCard): Promise<Album | null> {
  let head: ITunes | undefined;
  let songs: Song[] = [];
  if (card.collectionId) {
    for (const c of COUNTRIES) {
      const rows = await lookup(`id=${card.collectionId}&entity=song`, c);
      head = rows.find((r) => r.wrapperType === "collection");
      songs = rows.filter(playable).map(toSong);
      if (songs.length) break;
    }
  } else if (card.trackIds) {
    const found = new Map<string, Song>();
    for (const c of COUNTRIES) {
      const missing = card.trackIds.filter((id) => !found.has(String(id)));
      if (!missing.length) break;
      (await lookup(`id=${missing.join(",")}`, c)).filter(playable).forEach((r) => found.set(String(r.trackId), toSong(r)));
    }
    songs = card.trackIds.map((id) => found.get(String(id))).filter((s): s is Song => !!s);
  }
  if (!songs.length) return null;
  const art = big(head?.artworkUrl100) || songs[0].art;
  return {
    key: card.key,
    name: card.name ?? head?.collectionName ?? card.short,
    short: card.short,
    hand: card.hand,
    color: card.color,
    artist: head?.artistName ?? "Various",
    url: head?.collectionViewUrl ?? songs[0].url,
    art,
    arts: card.collectionId ? [art] : [...new Set(songs.map((s) => s.art))].slice(0, 4),
    songs,
  };
}

/** The walkman's SD cards, filled from Apple Music's catalogue. Fetched at build and refreshed daily; a card that fails to load is skipped. */
export async function getAlbums(): Promise<Album[]> {
  "use cache";
  cacheLife("days");
  const out = await Promise.all(cards.map(load));
  return out.filter((a): a is Album => !!a);
}
