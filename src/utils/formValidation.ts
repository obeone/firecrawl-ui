/**
 * Small, framework-free helpers shared by the playground forms.
 */

/** ISO 3166-1 alpha-2 country code, as required by `location.country` in the v2 API. */
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

/**
 * Result of validating a location country field.
 */
export interface CountryCodeCheck {
  /** Normalised code to send, absent when the field is empty. */
  code?: string;
  /** Human-readable error, set when the value is not a valid country code. */
  error?: string;
}

/**
 * Validate and normalise a country code typed in a form.
 *
 * The v2 API only accepts ISO 3166-1 alpha-2 codes (`US`, `DE`, `JP`...);
 * regions such as `EU` or `ASIA` are rejected by the server.
 *
 * @param value - The raw field value.
 * @returns The upper-cased code, nothing for an empty field, or an error.
 */
export function checkCountryCode(value: string | null | undefined): CountryCodeCheck {
  const trimmed = (value ?? '').trim().toUpperCase();
  if (trimmed === '') {
    return {};
  }
  if (!COUNTRY_CODE_PATTERN.test(trimmed)) {
    return {
      error: `Invalid country code "${trimmed}": use a two-letter ISO code such as US or DE.`,
    };
  }
  return { code: trimmed };
}

/**
 * Return the first non-empty error message, if any.
 *
 * Forms keep one error per JSON field; submission must stop while any of
 * them is set, otherwise the last valid value would be sent silently.
 *
 * @param errors - Error messages of the form fields.
 * @returns The first error, or undefined when every field is valid.
 */
export function firstFormError(
  errors: ReadonlyArray<string | null | undefined>,
): string | undefined {
  return errors.find((message): message is string => typeof message === 'string' && message !== '');
}
