import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CSP_HEADER_POLICY, CSP_META_POLICY, injectCspMeta } from './csp';

const nginxConf = readFileSync(new URL('../../nginx.conf', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

/**
 * Read the value of an `add_header` directive in nginx.conf.
 */
function nginxHeader(name: string): string | undefined {
  const match = new RegExp(`add_header\\s+${name}\\s+"([^"]*)"\\s+always;`).exec(nginxConf);
  return match?.[1];
}

describe('content security policy', () => {
  it('allows scripts and styles from this origin only', () => {
    expect(CSP_META_POLICY).toContain("script-src 'self';");
    expect(CSP_META_POLICY).toContain("style-src 'self';");
    expect(CSP_META_POLICY).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
  });

  it('keeps frame-ancestors out of the meta tag, where browsers ignore it', () => {
    expect(CSP_META_POLICY).not.toContain('frame-ancestors');
    expect(CSP_HEADER_POLICY).toContain("frame-ancestors 'none'");
  });

  it('is the policy nginx sends', () => {
    expect(nginxHeader('Content-Security-Policy')).toBe(CSP_HEADER_POLICY);
  });

  it('sends the companion security headers', () => {
    expect(nginxHeader('X-Frame-Options')).toBe('DENY');
    expect(nginxHeader('X-Content-Type-Options')).toBe('nosniff');
    expect(nginxHeader('Referrer-Policy')).toBe('no-referrer');
  });
});

describe('injectCspMeta', () => {
  it('puts the policy right after the charset, before any script', () => {
    const html = injectCspMeta(indexHtml);
    const meta = html.indexOf('http-equiv="Content-Security-Policy"');
    expect(meta).toBeGreaterThan(html.indexOf('<meta charset'));
    expect(meta).toBeLessThan(html.indexOf('<script'));
    expect(html).toContain(`content="${CSP_META_POLICY}"`);
  });

  it('refuses a document without a charset tag', () => {
    expect(() => injectCspMeta('<html><head></head></html>')).toThrow(/meta charset/);
  });
});
