<template>
  <div class="page-container billing-view">
    <h2>Billing &amp; Credits</h2>
    <p class="intro">Check the remaining Firecrawl credits available for your team.</p>

    <button type="button" class="primary-button" :disabled="loading" @click="fetchUsage">
      {{ loading ? 'Loading…' : 'Refresh credit usage' }}
    </button>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="status">Loading…</div>

    <div v-else-if="usage" class="results">
      <div class="credit-cards">
        <div class="credit-card highlight">
          <span class="credit-label">Remaining credits</span>
          <span class="credit-value">{{ formatNumber(usage.remainingCredits) }}</span>
        </div>
        <div v-if="usage.planCredits != null" class="credit-card">
          <span class="credit-label">Plan credits</span>
          <span class="credit-value">{{ formatNumber(usage.planCredits) }}</span>
        </div>
        <div v-if="tokenUsage" class="credit-card">
          <span class="credit-label">Remaining tokens (Extract)</span>
          <span class="credit-value">{{ formatNumber(tokenUsage.remainingTokens) }}</span>
        </div>
      </div>

      <div v-if="usage.billingPeriodStart || usage.billingPeriodEnd" class="billing-period">
        <h3>Billing period</h3>
        <p>
          <span v-if="usage.billingPeriodStart">{{ usage.billingPeriodStart }}</span>
          <span v-if="usage.billingPeriodStart && usage.billingPeriodEnd"> → </span>
          <span v-if="usage.billingPeriodEnd">{{ usage.billingPeriodEnd }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue';
import type { CreditUsage, TokenUsage, FirecrawlBillingApi } from '@/services/firecrawl';

/**
 * BillingView Component
 *
 * Displays the team's Firecrawl credit usage. It fetches the remaining credits
 * (and, when available, plan credits and the current billing period) from the
 * billing API adapter exposed by the API plugin.
 */

/**
 * Injects the API instance provided by the API plugin.
 * This instance is expected to contain a `billing` property for credit queries.
 * @type {{ billing?: FirecrawlBillingApi } | undefined}
 */
const api = inject('api') as { billing?: FirecrawlBillingApi } | undefined;
if (!api?.billing) {
  throw new Error(
    'Billing API is not available. Ensure the API plugin is correctly configured and provides the billing service.',
  );
}

/**
 * Reactive credit usage data returned by the API, or `null` before the first load.
 * @type {Ref<CreditUsage | null>}
 */
const usage = ref<CreditUsage | null>(null);

/**
 * Reactive token usage data (Extract feature), or `null` before the first load.
 * @type {Ref<TokenUsage | null>}
 */
const tokenUsage = ref<TokenUsage | null>(null);

/**
 * Reactive flag indicating whether a request is currently in progress.
 * @type {Ref<boolean>}
 */
const loading = ref(false);

/**
 * Reactive error message displayed when a request fails.
 * @type {Ref<string>}
 */
const error = ref('');

/**
 * Format a numeric credit value with thousands separators for readability.
 *
 * @param value - The numeric value to format, or `null` when unavailable.
 * @returns A localized string, or a dash when the value is missing.
 */
function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' ? value.toLocaleString() : '—';
}

/**
 * Fetch the current credit usage from the billing API and update local state.
 * Manages the loading and error states around the request.
 *
 * @returns {Promise<void>} A promise that resolves once the request completes.
 */
async function fetchUsage(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    // Fetch credit and token usage together; both belong to the Billing tag.
    const [creditResponse, tokenResponse] = await Promise.all([
      api.billing!.getCreditUsage(),
      api.billing!.getTokenUsage(),
    ]);
    usage.value = creditResponse.data;
    tokenUsage.value = tokenResponse.data;
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : 'Failed to fetch usage information. Please try again.';
    usage.value = null;
    tokenUsage.value = null;
  } finally {
    loading.value = false;
  }
}

// Automatically load credit usage when the view is mounted.
onMounted(fetchUsage);
</script>

<style scoped>
/* Main container for the BillingView component. */
.billing-view {
  max-width: 600px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-family: Arial, sans-serif;
}

/* Introductory description text. */
.intro {
  margin-bottom: 1rem;
  opacity: 0.8;
}

/* Primary action button. */
.primary-button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button:hover:not(:disabled) {
  background-color: #005fa3;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Results section wrapping the credit cards. */
.results {
  margin-top: 1.5rem;
}

/* Layout for the credit summary cards. */
.credit-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

/* Individual credit card. */
.credit-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  min-width: 160px;
  background: var(--color-background-soft);
}

/* Emphasized card for the primary metric. */
.credit-card.highlight {
  border-color: #007acc;
  background: var(--color-background-mute);
}

/* Small label above each credit value. */
.credit-label {
  font-size: 0.85rem;
  opacity: 0.7;
}

/* Prominent numeric credit value. */
.credit-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #007acc;
}

/* Billing period block. */
.billing-period {
  margin-top: 1.5rem;
}

.billing-period h3 {
  margin-bottom: 0.25rem;
}

/* Error message styling. */
.error {
  color: #d9534f;
  margin-top: 0.75rem;
}

/* Status (loading) message styling. */
.status {
  margin-top: 0.75rem;
}
</style>
