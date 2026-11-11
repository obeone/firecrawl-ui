import { describe, expect, it } from 'vitest';
import {
  JOB_HISTORY_MAX_ENTRIES,
  JOB_HISTORY_STORAGE_KEY,
  clearJobHistory,
  loadJobHistory,
  newLocalJobId,
  recordJob,
  removeJob,
  updateJob,
  type JobHistoryEntry,
  type StorageLike,
} from './jobHistory';

function memoryStorage(initial?: string): StorageLike & { raw(): string | null } {
  const map = new Map<string, string>();
  if (initial !== undefined) {
    map.set(JOB_HISTORY_STORAGE_KEY, initial);
  }
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    raw: () => map.get(JOB_HISTORY_STORAGE_KEY) ?? null,
  };
}

function entry(id: string, over: Partial<JobHistoryEntry> = {}): JobHistoryEntry {
  return {
    kind: 'crawl',
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    sourceUrl: 'https://example.com',
    resultCount: null,
    status: 'scraping',
    ...over,
  };
}

describe('jobHistory', () => {
  it('records and loads an entry', () => {
    const s = memoryStorage();
    recordJob(entry('a'), s);
    expect(loadJobHistory(s)).toEqual([entry('a')]);
  });

  it('upserts by kind and id and moves to top', () => {
    const s = memoryStorage();
    recordJob(entry('a'), s);
    recordJob(entry('b'), s);
    recordJob(entry('a', { status: 'completed' }), s);
    recordJob(entry('a', { kind: 'batch' }), s);
    const list = loadJobHistory(s);
    expect(list.map((e) => `${e.kind}:${e.id}`)).toEqual(['batch:a', 'crawl:a', 'crawl:b']);
    expect(list[1].status).toBe('completed');
  });

  it('caps at 200 entries dropping the oldest', () => {
    const s = memoryStorage();
    for (let i = 0; i < JOB_HISTORY_MAX_ENTRIES + 5; i++) {
      recordJob(entry(`j${i}`), s);
    }
    const list = loadJobHistory(s);
    expect(list).toHaveLength(JOB_HISTORY_MAX_ENTRIES);
    expect(list[0].id).toBe(`j${JOB_HISTORY_MAX_ENTRIES + 4}`);
    expect(list.some((e) => e.id === 'j0')).toBe(false);
  });

  it('updates, removes and clears', () => {
    const s = memoryStorage();
    recordJob(entry('a'), s);
    recordJob(entry('b'), s);
    expect(updateJob('crawl', 'a', { status: 'completed', resultCount: 7 }, s)[1]).toMatchObject({
      status: 'completed',
      resultCount: 7,
    });
    expect(updateJob('crawl', 'zzz', { status: 'x' }, s)).toHaveLength(2);
    expect(removeJob('crawl', 'a', s).map((e) => e.id)).toEqual(['b']);
    expect(clearJobHistory(s)).toEqual([]);
    expect(loadJobHistory(s)).toEqual([]);
  });

  it('tolerates corrupted JSON and non-arrays', () => {
    expect(loadJobHistory(memoryStorage('{not json'))).toEqual([]);
    expect(loadJobHistory(memoryStorage('{"a":1}'))).toEqual([]);
  });

  it('drops invalid entries', () => {
    const raw = JSON.stringify([
      entry('ok'),
      null,
      'str',
      { kind: 'nope', id: 'x' },
      { kind: 'crawl' },
      { kind: 'crawl', id: '' },
    ]);
    expect(loadJobHistory(memoryStorage(raw)).map((e) => e.id)).toEqual(['ok']);
  });

  it('never persists extra fields', () => {
    const s = memoryStorage();
    const big = {
      ...entry('a'),
      apiKey: 'fc-secret-key',
      markdown: '# scraped',
      headers: { Authorization: 'Bearer abc' },
    };
    recordJob(big as unknown as JobHistoryEntry, s);
    const raw = s.raw() as string;
    expect(raw).not.toContain('fc-secret-key');
    expect(raw).not.toContain('scraped');
    expect(raw).not.toContain('Bearer');
    expect(Object.keys(loadJobHistory(s)[0]).sort()).toEqual(
      ['createdAt', 'id', 'kind', 'resultCount', 'sourceUrl', 'status'].sort(),
    );
  });

  it('never persists tokens carried by the URL query string or fragment', () => {
    const s = memoryStorage();
    recordJob(entry('a', { sourceUrl: 'https://example.com/x?access_token=query-secret' }), s);
    recordJob(entry('b', { sourceUrl: 'https://example.com/y#access_token=hash-secret' }), s);
    recordJob(entry('c', { sourceUrl: 'not a url?sig=raw-secret' }), s);
    const raw = s.raw() as string;
    expect(raw).not.toContain('secret');
    expect(loadJobHistory(s).map((e) => e.sourceUrl)).toEqual([
      'not a url',
      'https://example.com/y',
      'https://example.com/x',
    ]);
  });

  it('rewrites entries stored by older versions on load', () => {
    const legacy = [
      { ...entry('a'), sourceUrl: 'https://u:p@example.com/x?token=old-secret', apiKey: 'fc-key' },
    ];
    const s = memoryStorage(JSON.stringify(legacy));
    expect(loadJobHistory(s)[0].sourceUrl).toBe('https://example.com/x');
    expect(s.raw()).not.toContain('old-secret');
    expect(s.raw()).not.toContain('fc-key');
    expect(s.raw()).not.toContain('u:p@');
  });

  it('removes unreadable history data', () => {
    const s = memoryStorage('{"sourceUrl":"https://example.com/?token=x"');
    expect(loadJobHistory(s)).toEqual([]);
    expect(s.raw()).toBeNull();
  });

  it('strips userinfo, truncates and normalizes counts', () => {
    const s = memoryStorage();
    recordJob(
      entry('a', {
        sourceUrl: 'https://user:pass@example.com/x',
        status: 's'.repeat(100),
        resultCount: -1,
      }),
      s,
    );
    recordJob(entry('b', { sourceUrl: 'https://e.com/' + 'a'.repeat(3000), resultCount: 3.7 }), s);
    const [b, a] = loadJobHistory(s);
    expect(a.sourceUrl).toBe('https://example.com/x');
    expect(s.raw()).not.toContain('pass');
    expect(a.status).toHaveLength(64);
    expect(a.resultCount).toBeNull();
    expect(b.sourceUrl).toHaveLength(2048);
    expect(b.resultCount).toBe(3);
  });

  it('never throws on a throwing storage', () => {
    const bad: StorageLike = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadJobHistory(bad)).toEqual([]);
    expect(() => recordJob(entry('a'), bad)).not.toThrow();
    expect(() => updateJob('crawl', 'a', { status: 'x' }, bad)).not.toThrow();
    expect(() => removeJob('crawl', 'a', bad)).not.toThrow();
    expect(() => clearJobHistory(bad)).not.toThrow();
  });

  it('generates unique local map ids', () => {
    const a = newLocalJobId();
    expect(a).toMatch(/^map-\d+-[a-z0-9]+$/);
    expect(newLocalJobId()).not.toBe(a);
  });
});
