import { afterEach, describe, expect, it } from 'vitest';
import { createFirecrawlApiClients, toCreditUsage, toTokenUsage } from './firecrawl';
import { stubHttp } from '@/test/httpStub';

const BASE = 'https://firecrawl.example.test';
let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

describe('toCreditUsage', () => {
  it('reads the camelCase fields documented for /v2/team/credit-usage', () => {
    expect(
      toCreditUsage({
        remainingCredits: 1000,
        planCredits: 500000,
        billingPeriodStart: '2025-01-01T00:00:00Z',
        billingPeriodEnd: '2025-01-31T23:59:59Z',
      }),
    ).toEqual({
      remainingCredits: 1000,
      planCredits: 500000,
      billingPeriodStart: '2025-01-01T00:00:00Z',
      billingPeriodEnd: '2025-01-31T23:59:59Z',
    });
  });

  it('still reads snake_case fields from older deployments', () => {
    expect(toCreditUsage({ remaining_credits: 3, plan_credits: 10 })).toMatchObject({
      remainingCredits: 3,
      planCredits: 10,
    });
  });

  it('returns nulls for missing or malformed data', () => {
    expect(toCreditUsage(undefined)).toEqual({
      remainingCredits: null,
      planCredits: null,
      billingPeriodStart: null,
      billingPeriodEnd: null,
    });
    expect(toCreditUsage({ remainingCredits: '12' }).remainingCredits).toBeNull();
  });
});

describe('toTokenUsage', () => {
  it('reads the camelCase fields documented for /v2/team/token-usage', () => {
    expect(
      toTokenUsage({
        remainingTokens: 42,
        planTokens: 100,
        billingPeriodStart: null,
        billingPeriodEnd: '2025-01-31T23:59:59Z',
      }),
    ).toEqual({
      remainingTokens: 42,
      planTokens: 100,
      billingPeriodStart: null,
      billingPeriodEnd: '2025-01-31T23:59:59Z',
    });
  });
});

describe('billing client', () => {
  it('surfaces camelCase credit and token usage from the API', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/team/credit-usage`]: {
        data: { success: true, data: { remainingCredits: 1000, planCredits: 500000 } },
      },
      [`${BASE}/v2/team/token-usage`]: {
        data: { success: true, data: { remainingTokens: 7, planTokens: 9 } },
      },
    });
    restore = stub.restore;

    const api = createFirecrawlApiClients('', BASE);
    const credits = await api.billing.getCreditUsage();
    const tokens = await api.billing.getTokenUsage();

    expect(credits.data.remainingCredits).toBe(1000);
    expect(credits.data.planCredits).toBe(500000);
    expect(tokens.data.remainingTokens).toBe(7);
    expect(tokens.data.planTokens).toBe(9);
  });
});
