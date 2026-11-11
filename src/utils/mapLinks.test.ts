import { describe, expect, it } from 'vitest';
import { filterMapLinks, normalizeMapLinks, type MapLink } from './mapLinks';

describe('normalizeMapLinks', () => {
  it('accepts plain strings', () => {
    expect(normalizeMapLinks(['https://a.test/'])).toEqual([{ url: 'https://a.test/' }]);
  });

  it('accepts objects with title and description', () => {
    expect(
      normalizeMapLinks([{ url: 'https://a.test/', title: 'A', description: 'About A' }]),
    ).toEqual([{ url: 'https://a.test/', title: 'A', description: 'About A' }]);
  });

  it('handles mixed entries', () => {
    expect(normalizeMapLinks(['https://a.test/', { url: 'https://b.test/', title: 'B' }])).toEqual([
      { url: 'https://a.test/' },
      { url: 'https://b.test/', title: 'B' },
    ]);
  });

  it('drops entries without a usable url and empty metadata', () => {
    expect(
      normalizeMapLinks([
        '',
        '   ',
        null,
        42,
        {},
        { url: 5 },
        { url: 'https://a.test/', title: '  ', description: 7 },
      ]),
    ).toEqual([{ url: 'https://a.test/' }]);
  });

  it('returns [] for non-array input', () => {
    expect(normalizeMapLinks(undefined)).toEqual([]);
    expect(normalizeMapLinks('https://a.test/')).toEqual([]);
    expect(normalizeMapLinks({ url: 'x' })).toEqual([]);
  });

  it('de-duplicates by url keeping the first', () => {
    expect(
      normalizeMapLinks([
        { url: 'https://a.test/', title: 'First' },
        'https://a.test/',
        { url: 'https://a.test/', title: 'Second' },
      ]),
    ).toEqual([{ url: 'https://a.test/', title: 'First' }]);
  });

  it('trims url, title and description', () => {
    expect(
      normalizeMapLinks([{ url: ' https://a.test/ ', title: ' T ', description: ' D ' }]),
    ).toEqual([{ url: 'https://a.test/', title: 'T', description: 'D' }]);
  });
});

describe('filterMapLinks', () => {
  const links: MapLink[] = [
    { url: 'https://site.test/docs/intro', title: 'Introduction', description: 'Getting started' },
    { url: 'https://site.test/blog/post', title: 'Release Notes' },
    { url: 'https://other.test/' },
  ];

  it('returns all links for an empty or blank query', () => {
    expect(filterMapLinks(links, '')).toEqual(links);
    expect(filterMapLinks(links, '   ')).toEqual(links);
  });

  it('matches case-insensitively on url', () => {
    expect(filterMapLinks(links, 'OTHER.test')).toEqual([links[2]]);
  });

  it('matches title and description', () => {
    expect(filterMapLinks(links, 'release')).toEqual([links[1]]);
    expect(filterMapLinks(links, 'STARTED')).toEqual([links[0]]);
  });

  it('requires every term to match', () => {
    expect(filterMapLinks(links, 'site docs')).toEqual([links[0]]);
    expect(filterMapLinks(links, 'site  other')).toEqual([]);
  });

  it('returns [] when nothing matches', () => {
    expect(filterMapLinks(links, 'zzz')).toEqual([]);
  });
});
