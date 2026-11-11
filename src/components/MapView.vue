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
      <form class="map-form" @submit.prevent="handleSubmit">
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
            <input v-model="includeSubdomains" type="checkbox" />
            Include Subdomains
          </label>
        </div>

        <div class="form-group">
          <label for="limit">Limit</label>
          <input id="limit" v-model.number="limit" type="number" min="1" max="100000" />
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
        <div class="links-toolbar">
          <div class="filter-group">
            <label for="linkFilter">Filter</label>
            <input
              id="linkFilter"
              v-model="filterQuery"
              type="text"
              placeholder="Filter by URL, title or description"
            />
          </div>
          <div class="selection-bar">
            <span class="selection-count">{{ filterStatus }} · {{ selected.size }} selected</span>
            <button type="button" class="mini-btn" @click="selectAllShown">Select all shown</button>
            <button
              type="button"
              class="mini-btn"
              :disabled="selected.size === 0"
              @click="clearSelection"
            >
              Clear selection
            </button>
            <button
              type="button"
              class="download-btn"
              :disabled="selected.size === 0"
              @click="sendToBatch"
            >
              Batch scrape selected ({{ selected.size }})
            </button>
          </div>
        </div>
        <ul class="url-list">
          <li v-for="link in filteredLinks" :key="link.url" class="url-item">
            <input
              type="checkbox"
              class="select-box"
              :checked="selected.has(link.url)"
              :aria-label="link.url"
              @change="toggleSelected(link.url)"
            />
            <div class="url-body">
              <span v-if="link.title" class="link-title">{{ link.title }}</span>
              <span class="url-text" :title="link.url">{{ link.url }}</span>
              <span v-if="link.description" class="link-description">{{ link.description }}</span>
            </div>
            <div class="url-actions">
              <CopyButton :text="link.url" label="Copy URL" />
              <a
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="open-link"
                :aria-label="`Open ${link.url} in a new tab`"
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
      <CodeBlock v-else-if="activeTab === 'json'" :json="links" label="JSON" />
    </template>

    <!-- ── Response actions: copy + download buttons in tab bar ───────── -->
    <template #response-actions>
      <CopyButton v-if="hasResult" :text="urlListText" label="Copy URL list" />
      <button v-if="hasResult" type="button" class="download-btn" @click="downloadJson">
        Download JSON
      </button>
    </template>
  </PlaygroundLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApi } from '@/plugins/api';
import { getErrorMessage } from '@/utils/errors';
import { useRoute, useRouter } from 'vue-router';
import { filterMapLinks, type MapLink } from '@/utils/mapLinks';
import { setPendingBatchUrls } from '@/utils/batchHandoff';
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
 */
const api = useApi();

/**
 * Reactive variable for the base URL entered by the user.
 * @type {Ref<string>}
 */
const baseUrl = ref('');

const route = useRoute();
const router = useRouter();

// Pre-fill the URL field from the ?url= query parameter (passed by the
// home-page launcher when the user picks a tool with a URL already typed).
onMounted(() => {
  const q = route.query.url;
  const initialUrl = Array.isArray(q) ? q[0] : q;
  if (initialUrl) {
    baseUrl.value = String(initialUrl);
  }
});

/**
 * Reactive variable for the optional search query used when mapping URLs.
 * @type {Ref<string>}
 */
const search = ref('');

/**
 * Reactive variable holding the sitemap strategy sent to the `/v2/map` endpoint.
 *
 * Defaults to `include`, matching the API default: the sitemap is the only link
 * source a self-hosted Firecrawl instance can rely on, so defaulting to `skip`
 * made every map request return an empty list there.
 *
 * @type {Ref<'include' | 'skip' | 'only'>}
 */
const sitemapMode = ref<'include' | 'skip' | 'only'>('include');

/**
 * Reactive variable to control whether subdomains of the website should be included in the mapping.
 * Defaults to `true`, like the v2 API.
 * @type {Ref<boolean>}
 */
const includeSubdomains = ref(true);

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
 * Links returned by the API, with title and description when the server provides them.
 */
const links = ref<MapLink[]>([]);

/** Plain URL list derived from `links`. */
const urls = computed<string[]>(() => links.value.map((link) => link.url));

/** Free-text filter applied to the displayed links. */
const filterQuery = ref('');

/** Links matching the current filter. */
const filteredLinks = computed<MapLink[]>(() => filterMapLinks(links.value, filterQuery.value));

/** Selected URLs; always replaced with a new Set so reactivity triggers. */
const selected = ref<Set<string>>(new Set());

/** "N of M links" while filtering, otherwise the plain count. */
const filterStatus = computed<string>(() =>
  filteredLinks.value.length === links.value.length
    ? `${links.value.length} link${links.value.length === 1 ? '' : 's'}`
    : `${filteredLinks.value.length} of ${links.value.length} links`,
);

/** Toggle one URL in the selection. */
function toggleSelected(url: string): void {
  const next = new Set(selected.value);
  if (!next.delete(url)) next.add(url);
  selected.value = next;
}

/** Add every currently shown link to the selection (hidden selections are kept). */
function selectAllShown(): void {
  const next = new Set(selected.value);
  for (const link of filteredLinks.value) next.add(link.url);
  selected.value = next;
}

/** Empty the selection. */
function clearSelection(): void {
  selected.value = new Set();
}

/** Hand the selected URLs (in list order) to Batch scrape and navigate there. */
function sendToBatch(): void {
  if (selected.value.size === 0) return;
  setPendingBatchUrls(urls.value.filter((url) => selected.value.has(url)));
  void router.push({ name: 'batch-scrape' });
}

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
const hasResult = computed<boolean>(() => links.value.length > 0);

/**
 * The result as plain text, one URL per line, ready to be dropped in a .txt
 * file or piped into another tool. Backs the "Copy URL list" action.
 */
const urlListText = computed<string>(() => urls.value.join('\n'));

/**
 * Status bar text: URL count on success, 'Error' on failure, null while idle.
 */
const statusText = computed<string | null>(() => {
  if (error.value) return 'Error';
  if (links.value.length > 0) return filterStatus.value;
  return null;
});

/**
 * Semantic status type that drives the status dot color in PlaygroundLayout.
 */
const statusType = computed<'success' | 'error' | 'idle'>(() => {
  if (error.value) return 'error';
  if (links.value.length > 0) return 'success';
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
  selected.value = new Set();
  filterQuery.value = '';
  const t0 = performance.now();
  try {
    const response = await api.mapping.mapUrls(payload);
    links.value = response.data.links ?? [];
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to map URLs. Please check the URL and try again.');
    links.value = [];
  } finally {
    durationMs.value = performance.now() - t0;
    loading.value = false;
  }
}

/**
 * Initiates the download of the found URLs as a JSON file.
 * Creates a Blob from the `links` array and triggers a download via a temporary anchor element.
 * The temporary link element is appended to the document body and then removed after the click
 * to ensure compatibility across different browsers and to clean up the DOM.
 * The Object URL is also revoked to free up resources.
 * @returns {void}
 */
function downloadJson(): void {
  const blob = new Blob([JSON.stringify(links.value, null, 2)], {
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

.url-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.link-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-description {
  font-size: 0.76rem;
  color: var(--color-text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-box {
  flex-shrink: 0;
  cursor: pointer;
}

.links-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1rem 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-soft);
}

.filter-group input {
  padding: 0.4rem 0.65rem;
  font-size: 0.88rem;
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}

.filter-group input:focus {
  border-color: var(--violet-500);
  box-shadow: var(--shadow-ring);
}

.selection-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.selection-count {
  font-size: 0.8rem;
  color: var(--color-text-soft);
  margin-right: auto;
}

.mini-btn {
  padding: 0.3rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-soft);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.mini-btn:hover:not(:disabled) {
  color: var(--brand-strong);
  border-color: var(--violet-500);
  background: var(--brand-soft);
}

.mini-btn:disabled,
.download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.url-text {
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
