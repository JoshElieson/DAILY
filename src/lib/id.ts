/**
 * Lightweight, dependency-free id generator. The local-first schema keys rows
 * on a `TEXT` uuid (PLANNING.md §3.4); this is sufficient for on-device ids and
 * ports cleanly to server-issued UUID v7 later.
 */
export function createId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  const id = `${time}${rand}`;
  return prefix ? `${prefix}_${id}` : id;
}
