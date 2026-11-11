import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('returns the message of an Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns a thrown string', () => {
    expect(getErrorMessage('plain failure')).toBe('plain failure');
  });

  it('falls back when nothing readable was thrown', () => {
    expect(getErrorMessage(undefined)).toBe('Unknown error');
    expect(getErrorMessage({ status: 500 }, 'Request failed')).toBe('Request failed');
    expect(getErrorMessage(new Error(''), 'Request failed')).toBe('Request failed');
  });
});
