import { describe, expect, it } from 'vitest';
import { resolveAppVersion } from './version';

const noGit = (): string => {
  throw new Error('not a git repository');
};

describe('resolveAppVersion', () => {
  it('prefers APP_VERSION and strips the tag prefix', () => {
    expect(resolveAppVersion('v2026.11.11', () => 'v1.0.0')).toBe('2026.11.11');
  });

  it('keeps a commit-based CI version as is', () => {
    expect(resolveAppVersion('sha-0943d27', noGit)).toBe('sha-0943d27');
  });

  it('falls back to git describe when APP_VERSION is empty', () => {
    expect(resolveAppVersion('  ', () => 'v2026.11.11-3-g0943d27\n')).toBe('2026.11.11-3-g0943d27');
  });

  it('returns dev without APP_VERSION or Git', () => {
    expect(resolveAppVersion(undefined, noGit)).toBe('dev');
  });

  it('does not strip a v that is not a tag prefix', () => {
    expect(resolveAppVersion('vnext', noGit)).toBe('vnext');
  });
});
