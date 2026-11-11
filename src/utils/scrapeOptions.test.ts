import { describe, expect, it } from 'vitest';
import {
  BATCH_FORMAT_OPTIONS,
  CRAWL_FORMAT_OPTIONS,
  SCRAPE_FORMAT_OPTIONS,
  buildBatchScrapePayload,
  buildTagFilters,
  defaultScrapeOptionsFormValue,
  splitCommaList,
  withFormField,
} from './scrapeOptions';

describe('splitCommaList', () => {
  it('trims entries and drops empty ones', () => {
    expect(splitCommaList(' article , .main-content,, ')).toEqual(['article', '.main-content']);
  });

  it('returns an empty list for blank input', () => {
    expect(splitCommaList('')).toEqual([]);
    expect(splitCommaList(' , ')).toEqual([]);
  });
});

describe('buildTagFilters', () => {
  it('omits filters that are empty or whitespace', () => {
    expect(buildTagFilters({ includeTags: '', excludeTags: '   ' })).toEqual({});
    expect(buildTagFilters({})).toEqual({});
  });

  it('splits non-blank filters', () => {
    expect(buildTagFilters({ includeTags: 'p, div', excludeTags: 'script' })).toEqual({
      includeTags: ['p', 'div'],
      excludeTags: ['script'],
    });
  });

  it('keeps a filter made only of separators as an empty list', () => {
    expect(buildTagFilters({ includeTags: ',' })).toEqual({ includeTags: [] });
  });
});

describe('withFormField', () => {
  it('replaces one field and keeps view-specific extras', () => {
    const value = { ...defaultScrapeOptionsFormValue(), onlyCleanContent: true };
    const next = withFormField(value, 'formats', ['html']);

    expect(next).toEqual({ ...value, formats: ['html'] });
    expect(next).not.toBe(value);
    expect(value.formats).toEqual(['markdown']);
  });
});

describe('buildBatchScrapePayload', () => {
  it('matches the historical payload when no tag filter is set', () => {
    expect(
      buildBatchScrapePayload(['https://a.test'], {
        ...defaultScrapeOptionsFormValue(),
        onlyMainContent: true,
      }),
    ).toEqual({ urls: ['https://a.test'], formats: ['markdown'], onlyMainContent: true });
  });

  it('always sends onlyMainContent, even when false', () => {
    const payload = buildBatchScrapePayload(['https://a.test'], {
      ...defaultScrapeOptionsFormValue(),
      onlyMainContent: false,
    });

    expect(payload.onlyMainContent).toBe(false);
  });

  it('adds tag filters when set', () => {
    expect(
      buildBatchScrapePayload(['https://a.test', 'https://b.test'], {
        formats: ['html', 'links'],
        onlyMainContent: true,
        includeTags: 'article',
        excludeTags: 'footer, .ads',
      }),
    ).toEqual({
      urls: ['https://a.test', 'https://b.test'],
      formats: ['html', 'links'],
      onlyMainContent: true,
      includeTags: ['article'],
      excludeTags: ['footer', '.ads'],
    });
  });
});

describe('format option lists', () => {
  it('offer the same formats in Scrape and Crawl', () => {
    expect(SCRAPE_FORMAT_OPTIONS.map((option) => option.value)).toEqual(
      CRAWL_FORMAT_OPTIONS.map((option) => option.value),
    );
  });

  it('offer only adapter-mapped plain formats in Batch', () => {
    expect(BATCH_FORMAT_OPTIONS.map((option) => option.value)).toEqual([
      'markdown',
      'html',
      'rawHtml',
      'links',
      'summary',
      'screenshot',
      'screenshot@fullPage',
    ]);
  });
});
