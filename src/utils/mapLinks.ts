/**
 * A link discovered by the Map endpoint, with optional page metadata.
 */
export interface MapLink {
  url: string;
  title?: string;
  description?: string;
}

/**
 * Return a trimmed string, or undefined when the value is not a non-empty string.
 *
 * @param value - Candidate value.
 * @returns The trimmed string, or undefined.
 */
function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Normalize the `links` array of a `/v2/map` response.
 *
 * Entries are either plain URL strings (older servers) or objects with `url`
 * and optional `title` / `description`. Entries without a usable URL are
 * dropped, empty metadata is omitted, and duplicate URLs keep the first entry.
 *
 * @param raw - The raw `links` value from the response.
 * @returns A de-duplicated list of links; empty when `raw` is not an array.
 */
export function normalizeMapLinks(raw: unknown): MapLink[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const links: MapLink[] = [];
  for (const entry of raw) {
    const record =
      typeof entry === 'string' ? { url: entry } : (entry as Record<string, unknown> | null);
    const url = cleanText(record?.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const title = cleanText(record?.title);
    const description = cleanText(record?.description);
    links.push({
      url,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    });
  }
  return links;
}

/**
 * Filter links by a free-text query.
 *
 * Matching is a case-insensitive substring search over URL, title and
 * description. Whitespace-separated terms must all match (AND).
 *
 * @param links - Links to filter.
 * @param query - The user's filter text.
 * @returns The matching links, or all of them for a blank query.
 */
export function filterMapLinks(links: MapLink[], query: string): MapLink[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return links;
  return links.filter((link) => {
    const haystack = `${link.url}\n${link.title ?? ''}\n${link.description ?? ''}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
