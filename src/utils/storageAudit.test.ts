import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Inventory of browser persistence in the application source.
 *
 * Each module below was audited for what it writes:
 * - `App.vue`: the colour theme (`theme`).
 * - `config/api.ts`: the API base URL and the API key the user saves on the
 *   settings page (`firecrawl_base_url`, `firecrawl_api_key`), by design.
 * - `components/ApiKeyInput.vue`: reads those two settings, writes nothing.
 * - `utils/jobHistory.ts`: job metadata only (`firecrawl-ui:job-history`).
 * - `utils/crawlHistory.ts`: whitelisted crawl fields (`crawlHistory`), no
 *   webhook options, request headers or actions.
 *
 * A new storage access elsewhere fails this test: audit it, then add it here.
 */
const AUDITED = [
  'App.vue',
  'components/ApiKeyInput.vue',
  'config/api.ts',
  'utils/crawlHistory.ts',
  'utils/jobHistory.ts',
];

const SRC = fileURLToPath(new URL('..', import.meta.url));
const STORAGE_API = /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/;

/**
 * List source files under a directory, skipping tests and generated types.
 *
 * @param dir - Directory to walk.
 * @returns Absolute file paths.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    const isSource = /\.(ts|vue)$/.test(name) && !name.endsWith('.test.ts');
    return isSource && !name.endsWith('.generated.ts') ? [path] : [];
  });
}

describe('browser storage audit', () => {
  it('touches storage only from audited modules', () => {
    const users = sourceFiles(SRC)
      .filter((file) => STORAGE_API.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file).split('\\').join('/'))
      .sort();
    expect(users).toEqual(AUDITED);
  });

  it('keeps the Crawl view away from raw storage', () => {
    const view = readFileSync(join(SRC, 'views/CrawlView.vue'), 'utf8');
    expect(view).not.toMatch(STORAGE_API);
    expect(view).toContain('saveCrawlHistory(');
    expect(view).toContain('loadCrawlHistory(');
  });
});
