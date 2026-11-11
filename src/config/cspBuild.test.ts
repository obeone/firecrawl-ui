import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { build, type Rolldown } from 'vite';
import { CSP_META_POLICY } from './csp';

const root = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Build the app in memory and return the emitted index.html.
 */
async function builtIndexHtml(): Promise<string> {
  const result = await build({
    root,
    configFile: `${root}vite.config.ts`,
    logLevel: 'silent',
    build: { write: false },
  });
  const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
  for (const { output } of outputs) {
    for (const file of output) {
      if (file.type === 'asset' && file.fileName === 'index.html') {
        return typeof file.source === 'string'
          ? file.source
          : new TextDecoder().decode(file.source);
      }
    }
  }
  throw new Error('index.html missing from the build output');
}

describe('built index.html', () => {
  it('declares the CSP before any script or stylesheet', async () => {
    const html = await builtIndexHtml();
    const meta = html.indexOf('http-equiv="Content-Security-Policy"');
    const firstScript = html.indexOf('<script');
    const firstStylesheet = html.search(/<link[^>]+rel="(?:stylesheet|modulepreload)"/);

    expect(meta).toBeGreaterThan(html.indexOf('<meta charset'));
    expect(firstScript).toBeGreaterThan(-1);
    expect(meta).toBeLessThan(firstScript);
    if (firstStylesheet !== -1) expect(meta).toBeLessThan(firstStylesheet);
    expect(html).toContain(`content="${CSP_META_POLICY}"`);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
  }, 120_000);
});
