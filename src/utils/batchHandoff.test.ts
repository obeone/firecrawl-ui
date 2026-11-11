import { describe, expect, it } from 'vitest';
import { setPendingBatchUrls, takePendingBatchUrls } from './batchHandoff';

describe('batchHandoff', () => {
  it('returns null when nothing is pending', () => {
    expect(takePendingBatchUrls()).toBeNull();
  });

  it('returns the URLs once, then null', () => {
    setPendingBatchUrls(['https://a.test/', 'https://b.test/']);
    expect(takePendingBatchUrls()).toEqual(['https://a.test/', 'https://b.test/']);
    expect(takePendingBatchUrls()).toBeNull();
  });

  it('stores a copy that is not aliased to the caller array', () => {
    const urls = ['https://a.test/'];
    setPendingBatchUrls(urls);
    urls.push('https://b.test/');
    expect(takePendingBatchUrls()).toEqual(['https://a.test/']);
  });
});
