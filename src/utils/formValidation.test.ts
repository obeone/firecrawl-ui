import { describe, expect, it } from 'vitest';
import { checkCountryCode, firstFormError } from './formValidation';

describe('checkCountryCode', () => {
  it('accepts and upper-cases a two-letter ISO code', () => {
    expect(checkCountryCode(' de ')).toEqual({ code: 'DE' });
  });

  it('treats an empty field as unset', () => {
    expect(checkCountryCode('')).toEqual({});
    expect(checkCountryCode(undefined)).toEqual({});
  });

  it.each(['ASIA', 'USA', 'F1', 'u'])('rejects %s', (value) => {
    const result = checkCountryCode(value);
    expect(result.code).toBeUndefined();
    expect(result.error).toMatch(/Invalid country code/);
  });
});

describe('firstFormError', () => {
  it('returns the first non-empty message', () => {
    expect(firstFormError(['', null, 'Invalid JSON: x', 'later'])).toBe('Invalid JSON: x');
  });

  it('returns undefined when every field is valid', () => {
    expect(firstFormError(['', undefined, null])).toBeUndefined();
  });
});
