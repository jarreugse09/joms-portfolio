// Tiny pub/sub so the eye, ship, and player can react to each other without a state library.

type Events = {
  /** 0..1 loudness from the player while music plays, 0 when stopped */
  level: number;
  playing: boolean;
  /** something the eye should react to */
  poke: "click" | "ship";
};

type Handler<T> = (value: T) => void;
const handlers: { [K in keyof Events]?: Set<Handler<Events[K]>> } = {};

export function on<K extends keyof Events>(event: K, fn: Handler<Events[K]>) {
  const map = handlers as Record<string, Set<Handler<Events[K]>> | undefined>;
  const set = (map[event] ??= new Set<Handler<Events[K]>>());
  set.add(fn);
  return () => set.delete(fn);
}

export function emit<K extends keyof Events>(event: K, value: Events[K]) {
  (handlers[event] as Set<Handler<Events[K]>> | undefined)?.forEach((fn) => fn(value));
}
