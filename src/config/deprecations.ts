/**
 * Firecrawl features this UI still offers although upstream deprecated them.
 *
 * Deep Research and LLMs.txt generation are legacy `/v1` endpoints: the v2
 * OpenAPI spec does not define them, and Firecrawl removes them from its
 * cloud API on 2026-12-10 at 15:00 UTC. The tools stay available for
 * self-hosted installs that still serve them; the UI only labels them.
 *
 * @see https://docs.firecrawl.dev/features/alpha/deep-research
 * @see https://docs.firecrawl.dev/features/alpha/llmstxt
 */
export interface DeprecatedFeature {
  /** Short label shown next to the tool name in the top bar. */
  badge: string;
  /** Upstream removal date of the cloud endpoint, ISO 8601 in UTC. */
  removal: string;
  /** What Firecrawl recommends instead, as plain text. */
  replacement: string;
  /** Upstream migration guide. */
  migrationGuide: string;
}

/** Removal date announced by Firecrawl for both legacy endpoints. */
const V1_REMOVAL = '2026-12-10T15:00:00Z';

/**
 * Deprecated tools, keyed by their router path.
 */
export const DEPRECATED_TOOLS: Readonly<Record<string, DeprecatedFeature>> = {
  '/research': {
    badge: 'v1',
    removal: V1_REMOVAL,
    replacement: 'the Agent endpoint (/v2/agent) or a research loop built on Search',
    migrationGuide: 'https://docs.firecrawl.dev/migrating-from-deep-research',
  },
  '/llmstxt': {
    badge: 'v1',
    removal: V1_REMOVAL,
    replacement: 'Map (/v2/map) followed by Batch Scrape (/v2/batch/scrape)',
    migrationGuide: 'https://docs.firecrawl.dev/migrating-from-llmstxt',
  },
};

/**
 * Look up the deprecation entry of a tool.
 *
 * @param path - The tool's router path, e.g. `/research`.
 * @returns The entry, or undefined when the tool is not deprecated.
 */
export function deprecationFor(path: string): DeprecatedFeature | undefined {
  return Object.hasOwn(DEPRECATED_TOOLS, path) ? DEPRECATED_TOOLS[path] : undefined;
}

/**
 * Format a removal date for display, in UTC so every reader sees the same day.
 *
 * @param iso - ISO 8601 date-time.
 * @returns For example "10 December 2026, 15:00 UTC".
 */
export function formatRemovalDate(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }).format(date);
  return `${day}, ${time} UTC`;
}
