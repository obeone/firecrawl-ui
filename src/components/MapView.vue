<template>
  <PlaygroundLayout
    title="Map"
    subtitle="Discover all URLs on a website"
    :tabs="[
      { key: 'links', label: 'Links' },
      { key: 'json', label: 'JSON' },
    ]"
    :running="loading"
    :error="error || null"
    :has-result="hasResult"
    :status="statusText"
    :status-type="statusType"
    :duration="durationMs"
    empty-hint="Enter a URL and click Find URLs to discover all links on the site."
  >
    <!-- ── Request pane ─────────────────────────────────────────────────── -->
    <template #request>
      <form @submit.prevent="handleSubmit" class="map-form">
        <div class="form-group">
          <label for="baseUrl">Base URL</label>
          <input
            id="baseUrl"
            v-model="baseUrl"
            type="url"
            placeholder="https://example.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="search">Search Query</label>
          <input id="search" v-model="search" type="text" placeholder="Optional search terms" />
        </div>

        <div class="form-group">
          <label for="sitemapMode">Sitemap Mode</label>
          <select id="sitemapMode" v-model="sitemapMode">
            <option value="include">Include sitemap</option>
            <option value="skip">Skip sitemap</option>
            <option value="only">Only sitemap URLs</option>
          </select>
        </div>

        <div class="form-group form-group--checkbox">
          <label class="checkbox-label">
            <input type="checkbox" v-model="includeSubdomains" />
            Include Subdomains
          </label>
        </div>

        <div class="form-group">
          <label for="limit">Limit</label>
          <input id="limit" v-model.number="limit" type="number" min="1" max="30000" />
        </div>

        <div class="form-group">
          <label for="timeout">Timeout (ms)</label>
          <input id="timeout" v-model.number="timeout" type="number" min="0" />
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="btn-spinner" aria-hidden="true"></span>
          {{ loading ? 'Mapping…' : 'Find URLs' }}
        </button>
      </form>
    </template>

    <!-- ── Response pane ───────────────────────────────────────────────── -->
    <template #response="{ activeTab }">
      <!-- Links tab: rendered list with per-item copy + open affordance -->
      <div v-if="activeTab === 'links'" class="links-pane">
        <ul class="url-list">
          <li v-for="(url, index) in urls" :key="index" class="url-item">
            <span class="url-text" :title="url">{{ url }}</span>
            <div class="url-actions">
              <CopyButton :text="url" label="Copy URL" />
              <a
                :href="url"
                target="_blank"
                rel="noopener noreferrer"
                class="open-link"
                :aria-label="`Open ${url} in a new tab`"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open
              </a>
            </div>
          </li>
        </ul>
      </div>

      <!-- JSON tab: raw result dump -->
      <CodeBlock v-else-if="activeTab === 'json'" :json="urls" label="JSON" />
    </template>

    <!-- ── Response actions: download button in tab bar ───────────────── -->
    <template #response-actions>
      <button v-if="hasResult" type="button" class="download-btn" @click="downloadJson">
        Download JSON
      </button>
    </template>
  </PlaygroundLayout>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { FirecrawlMappingApi } from '@/services/firecrawl';
import PlaygroundLayout from './playground/PlaygroundLayout.vue';
import CodeBlock from './playground/CodeBlock.vue';
import CopyButton from './playground/CopyButton.vue';

/**
 * MapView Component
 *
 * This component allows users to map URLs starting from a specified base URL.
 * It provides various options for mapping, including search queries, sitemap handling,
 * and limits on the number of links to retrieve.
 */

/**
 * Injects the API instance provided by the API plugin.
 * This instance is expected to contain a `mapping` property for URL mapping operations.
 * @type {{ mapping?: FirecrawlMappingApi } | undefined}
 */
const api = inject('api') as { mapping?: FirecrawlMappingApi } | undefined;
if (!api?.mapping) {
  throw new Error(
    'Mapping API is not available. Ensure the API plugin is correctly configured and provides the mapping service.',
  );
}

/**
 * Reactive variable for the base URL entered by the user.
 * @type {Ref<string>}
 */
const baseUrl = ref('');

/**
 * Reactive variable for the optional search query used when mapping URLs.
 * @type {Ref<string>}
 */
const search = ref('');

/**
 * Reactive variable to control whether the website sitemap should be ignored during crawling.
 * Defaults to `true`.
 * @type {Ref<boolean>}
 */
const sitemapMode = ref<'include' | 'skip' | 'only'>('skip');

/**
 * Reactive variable to control whether subdomains of the website should be included in the mapping.
 * Defaults to `false`.
 * @type {Ref<boolean>}
 */
const includeSubdomains = ref(false);

/**
 * Reactive variable for the maximum number of links to return.
 * Defaults to `5000`.
 * @type {Ref<number>}
 */
const limit = ref(5000);

/**
 * Reactive variable for the request timeout in milliseconds.
 * Can be `null` if no timeout is specified.
 * @type {Ref<number | null>}
 */
const timeout = ref<number | null>(null);

/**
 * Reactive variable to store the list of URLs returned by the API.
 * @type {Ref<string[]>}
 */
const urls = ref<string[]>([]);

/**
 * Reactive variable indicating whether an API request is currently in progress.
 * @type {Ref<boolean>}
 */
const loading = ref(false);

/**
 * Reactive variable to hold any error message received from the API call.
 * @type {Ref<string>}
 */
const error = ref('');

/**
 * Duration of the last completed request in milliseconds, or null before any request.
 * @type {Ref<number | null>}
 */
const durationMs = ref<number | null>(null);

// ── Additive computeds for PlaygroundLayout props ──────────────────────────

/**
 * Whether a non-empty result is currently held, used to drive the hasResult prop
 * and the visibility of the download button.
 */
const hasResult = computed<boolean>(() => urls.value.length > 0);

/**
 * Status bar text: URL count on success, 'Error' on failure, null while idle.
 */
const statusText = computed<string | null>(() => {
  if (error.value) return 'Error';
  if (urls.value.length > 0)
    return `${urls.value.length} link${urls.value.length === 1 ? '' : 's'}`;
  return null;
});

/**
 * Semantic status type that drives the status dot color in PlaygroundLayout.
 */
const statusType = computed<'success' | 'error' | 'idle'>(() => {
  if (error.value) return 'error';
  if (urls.value.length > 0) return 'success';
  return 'idle';
});

// ──────────────────────────────────────────────────────────────────────────

/**
 * Handles the form submission event.
 * Constructs the payload for the `mapUrls` API request based on user input,
 * then calls the API to fetch mapped URLs. Manages loading and error states.
 * @returns {Promise<void>} A promise that resolves when the API call is complete.
 */
async function handleSubmit(): Promise<void> {
  const payload = {
    url: baseUrl.value,
    search: search.value || undefined,
    sitemap: sitemapMode.value,
    includeSubdomains: includeSubdomains.value,
    limit: limit.value || undefined,
    timeout: timeout.value ?? undefined,
  };

  loading.value = true;
  error.value = '';
  const t0 = performance.now();
  try {
    const response = await api.mapping.mapUrls(payload);
    urls.value = response.data.links ?? [];
  } catch (err: any) {
    // Cast err to any to access message property safely
    error.value = err?.message || 'Failed to map URLs. Please check the URL and try again.';
    urls.value = [];
  } finally {
    durationMs.value = performance.now() - t0;
    loading.value = false;
  }
}

/**
 * Initiates the download of the found URLs as a JSON file.
 * Creates a Blob from the `urls` array and triggers a download via a temporary anchor element.
 * The temporary link element is appended to the document body and then removed after the click
 * to ensure compatibility across different browsers and to clean up the DOM.
 * The Object URL is also revoked to free up resources.
 * @returns {void}
 */
function downloadJson(): void {
  const blob = new Blob([JSON.stringify(urls.value, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'urls.json';
  document.body.appendChild(link); // Append to body to ensure it's clickable in all browsers
  link.click();
  document.body.removeChild(link); // Clean up the temporary element
  URL.revokeObjectURL(link.href); // Release the object URL
}
</script>

<style scoped>
/* ---------------------------------------------------------------------------
 * MapView — request pane form and result link list.
 *
 * Follows the Glass / Aurora design language: glassy inputs with violet focus
 * halo, aurora-gradient primary buttons, and result rows that lift on hover.
 * Old "fire" gradient and ember orange references are replaced with cool tokens.
 * ------------------------------------------------------------------------- */

/* ── Request pane form ───────────────────────────────────────────────────── */

.map-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Label + input stacked pair */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--color-text-soft);
}

/* Text / number / url inputs — translucent fill, violet focus halo. */
.form-group input[type='url'],
.form-group input[type='text'],
.form-group input[type='number'],
.form-group select {
  padding: 0.45rem 0.7rem;
  font-size: 0.93rem;
  font-family: var(--font-sans);
  color: var(--color-text);
  /* Semi-transparent so the aurora subtly tints the fields. */
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

/* Focus: violet border + soft violet halo ring (cool, not orange). */
.form-group input:focus,
.form-group select:focus {
  border-color: var(--violet-500);
  box-shadow: var(--shadow-ring);
}

/* Checkbox row — label and checkbox share a horizontal line. */
.form-group--checkbox {
  flex-direction: row;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
}

/* Submit button — violet→cyan aurora gradient primary CTA.
   Replaces the old fire gradient; glow is cool violet, not orange. */
.submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  align-self: flex-start;
  padding: 0.5rem 1.1rem;
  font-size: 0.93rem;
  font-weight: 600;
  color: #fff;
  background: var(--gradient-violet);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.submit-btn:hover:not(:disabled) {
  background: var(--gradient-violet-hover);
  transform: translateY(-1px);
  /* Cool violet glow on hover instead of the old orange. */
  box-shadow: 0 10px 26px -6px rgba(124, 92, 255, 0.6);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Inline spinner inside the submit button while loading */
.btn-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  animation: spin 0.65s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Links tab ───────────────────────────────────────────────────────────── */

/* Full-height scrollable list so long result sets don't overflow the pane */
.links-pane {
  height: 100%;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.url-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* Each URL row: text + action buttons side by side.
   Hover-lift with a faint violet tint for the glass aesthetic. */
.url-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
  min-width: 0;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.url-item:hover {
  /* Subtle glass highlight on hover — keeps monospace URLs readable. */
  background: var(--glass-fill);
  border-color: var(--color-border-hover);
}

.url-item:last-child {
  border-bottom: none;
}

.url-text {
  flex: 1;
  min-width: 0;
  font-size: 0.84rem;
  font-family: var(--font-mono);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.url-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

/* "Open" external link — glass mini-button, violet accent on hover. */
.open-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-soft);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.3rem 0.55rem;
  text-decoration: none;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.open-link:hover {
  color: var(--brand-strong);
  border-color: var(--violet-500);
  background: var(--brand-soft);
}

.open-link svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ── Download button (lives in #response-actions slot) ───────────────────── */

/* Compact violet→cyan aurora button matching the submit-btn style. */
.download-btn {
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  background: var(--gradient-violet);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.download-btn:hover {
  background: var(--gradient-violet-hover);
  transform: translateY(-1px);
  box-shadow: 0 8px 22px -6px rgba(124, 92, 255, 0.6);
}
</style>
