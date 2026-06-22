<template>
  <PlaygroundLayout
    title="Scrape"
    subtitle="Extract content from a single page"
    :tabs="responseTabs"
    :running="loading"
    :error="error || null"
    :has-result="!!result"
    :status="statusLabel"
    :status-type="statusType"
    :duration="durationMs"
    empty-hint="Configure a URL and run a scrape to see the response here."
  >
    <!-- REQUEST: scrape configuration form + submit button -->
    <template #request>
      <form class="scrape-config-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="url">URL:</label>
          <input id="url" v-model="formData.url" type="text" required />
        </div>

        <div class="form-group">
          <label for="formats">Output Formats:</label>
          <select id="formats" v-model="formData.scrapeOptions.formats" multiple>
            <option value="markdown">Markdown</option>
            <option value="html">HTML</option>
            <option value="rawHtml">Raw HTML</option>
            <option value="links">Links</option>
            <option value="images">Images</option>
            <option value="summary">Summary</option>
            <option value="screenshot">Screenshot (Viewport)</option>
            <option value="screenshot@fullPage">Screenshot (Full Page)</option>
            <option value="json">JSON (Structured Extraction)</option>
            <option value="attributes">Attributes</option>
            <option value="branding">Branding</option>
            <option value="changeTracking">Change Tracking (Requires Markdown)</option>
          </select>
          <small>Select one or more formats.</small>
        </div>

        <!-- Change Tracking Options (conditional) -->
        <div
          v-if="formData.scrapeOptions.formats.includes('changeTracking')"
          class="form-group"
        >
          <label for="changeTrackingThreshold">Change Threshold (%):</label>
          <input
            id="changeTrackingThreshold"
            type="number"
            min="0"
            max="100"
            v-model.number="formData.changeTrackingOptions.threshold"
          />
          <small>Minimum percentage change to trigger tracking.</small>

          <label for="changeTrackingFrequency">Check Frequency (minutes):</label>
          <input
            id="changeTrackingFrequency"
            type="number"
            min="1"
            v-model.number="formData.changeTrackingOptions.frequency"
          />
          <small>Frequency to check for changes.</small>
        </div>

        <fieldset class="form-group options-fieldset">
          <legend
            class="collapsible-header"
            @click="isScrapeOptionsCollapsed = !isScrapeOptionsCollapsed"
          >
            Scrape Options
          </legend>
          <div v-show="!isScrapeOptionsCollapsed">
            <label>
              <input type="checkbox" v-model="formData.scrapeOptions.onlyMainContent" />
              Only Main Content (exclude headers, footers, etc.)
            </label>
            <div class="form-group">
              <label for="includeTags">Include Tags (comma separated):</label>
              <input
                id="includeTags"
                type="text"
                v-model="formData.scrapeOptions.includeTags"
                placeholder="e.g. p, div, span"
              />
            </div>
            <div class="form-group">
              <label for="excludeTags">Exclude Tags (comma separated):</label>
              <input
                id="excludeTags"
                type="text"
                v-model="formData.scrapeOptions.excludeTags"
                placeholder="e.g. script, style"
              />
            </div>
          </div>
        </fieldset>

        <fieldset class="form-group options-fieldset">
          <legend
            class="collapsible-header"
            @click="isPageOptionsCollapsed = !isPageOptionsCollapsed"
          >
            Page Options
          </legend>
          <div v-show="!isPageOptionsCollapsed">
            <div class="grid-layout">
              <div class="form-group">
                <label for="waitFor">Wait For (ms):</label>
                <input
                  id="waitFor"
                  v-model.number="formData.pageOptions.waitFor"
                  type="number"
                  min="0"
                />
                <small>Delay before fetching content.</small>
              </div>
              <div class="form-group">
                <label for="maxAge">Max Age (ms):</label>
                <input
                  id="maxAge"
                  v-model.number="formData.pageOptions.maxAge"
                  type="number"
                  min="0"
                />
                <small>Use cached page if younger than this age.</small>
              </div>
              <div class="form-group">
                <label for="timeout">Timeout (ms):</label>
                <input
                  id="timeout"
                  v-model.number="formData.pageOptions.timeout"
                  type="number"
                  min="0"
                />
                <small>Page request timeout (default: 30000).</small>
              </div>
              <div class="form-group">
                <label for="proxy">Proxy:</label>
                <select id="proxy" v-model="formData.pageOptions.proxy">
                  <option value="">Default</option>
                  <option value="auto">Auto</option>
                  <option value="basic">Basic</option>
                  <option value="stealth">Stealth</option>
                  <option value="enhanced">Enhanced</option>
                </select>
                <small>Proxy type for request.</small>
              </div>
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.pageOptions.mobile" />
                Emulate Mobile Device
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.pageOptions.skipTlsVerification" />
                Skip TLS Verification
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.pageOptions.blockAds" />
                Block Ads & Popups
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.pageOptions.removeBase64Images" />
                Remove Base64 Images
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.pageOptions.parsePDF" />
                Parse PDF Files
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.pageOptions.storeInCache" />
                Store In Cache
              </label>
            </div>
            <div class="form-group">
              <label for="headers">HTTP Headers (JSON format):</label>
              <textarea
                id="headers"
                v-model="headersJson"
                rows="4"
                placeholder='{"Authorization": "Bearer token", "Accept": "application/json"}'
              ></textarea>
              <div v-if="headersError" class="error-message">{{ headersError }}</div>
              <small>Enter HTTP headers as JSON object.</small>
            </div>
            <div class="form-group">
              <label for="action">HTTP Action:</label>
              <select id="action" v-model="formData.pageOptions.action">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
              <small>Select HTTP method for the request.</small>
            </div>
            <div class="form-group">
              <label for="location">Location:</label>
              <select id="location" v-model="formData.pageOptions.location">
                <option value="">Auto</option>
                <option value="US">US</option>
                <option value="EU">EU</option>
                <option value="ASIA">ASIA</option>
              </select>
              <small>Select request location.</small>
            </div>
            <div class="form-group">
              <label>Actions:</label>
              <div
                v-for="(action, idx) in formData.pageOptions.actions"
                :key="idx"
                class="action-item"
              >
                <select v-model="action.type">
                  <option v-for="t in actionTypes" :key="t" :value="t">{{ t }}</option>
                </select>
                <template v-if="action.type === 'wait'">
                  <input
                    type="number"
                    v-model.number="action.milliseconds"
                    placeholder="ms"
                    min="1"
                  />
                  <input type="text" v-model="action.selector" placeholder="selector" />
                </template>
                <template v-else-if="action.type === 'screenshot'">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="action.fullPage" /> Full Page
                  </label>
                </template>
                <template v-else-if="action.type === 'click'">
                  <input type="text" v-model="action.selector" placeholder="selector" />
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="action.all" /> All
                  </label>
                </template>
                <template v-else-if="action.type === 'write'">
                  <input type="text" v-model="action.text" placeholder="text" />
                </template>
                <template v-else-if="action.type === 'press'">
                  <input type="text" v-model="action.key" placeholder="key" />
                </template>
                <template v-else-if="action.type === 'scroll'">
                  <select v-model="action.direction">
                    <option value="down">down</option>
                    <option value="up">up</option>
                  </select>
                  <input type="text" v-model="action.selector" placeholder="selector" />
                </template>
                <template v-else-if="action.type === 'executeJavascript'">
                  <textarea v-model="action.script" rows="2" placeholder="script"></textarea>
                </template>
                <button type="button" @click="removeAction(idx)">Remove</button>
              </div>
              <button type="button" @click="addAction">Add Action</button>
            </div>
          </div>
        </fieldset>

        <div
          v-if="formData.scrapeOptions.formats.includes('json')"
          class="form-group"
        >
          <label for="extractorOptions">Extractor Options (JSON format):</label>
          <textarea
            id="extractorOptions"
            v-model="extractorOptionsJson"
            rows="8"
            placeholder='e.g. {"key": "value"}'
          ></textarea>
          <small>Enter JSON options for extraction. Must be valid JSON.</small>
          <div v-if="extractorOptionsError" class="error-message">
            {{ extractorOptionsError }}
          </div>
        </div>

        <div
          v-if="formData.scrapeOptions.formats.includes('attributes')"
          class="form-group"
        >
          <label for="attributesOptions">Attribute Selectors (JSON format):</label>
          <textarea
            id="attributesOptions"
            v-model="attributesOptionsJson"
            rows="8"
            placeholder='[{"selector": "a", "attribute": "href"}]'
          ></textarea>
          <small>Enter a JSON array of selector and attribute pairs.</small>
          <div v-if="attributesOptionsError" class="error-message">
            {{ attributesOptionsError }}
          </div>
        </div>

        <button type="submit" class="primary-button">Scrape</button>
      </form>
    </template>

    <!-- RESPONSE: result rendering switched on the active tab -->
    <template #response="{ activeTab }">
      <!-- Preview: rendered markdown text or HTML content as plain text -->
      <div v-if="activeTab === 'preview'" class="preview-pane">
        <pre>{{ previewContent }}</pre>
      </div>

      <!-- Markdown: raw markdown via CodeBlock -->
      <CodeBlock
        v-else-if="activeTab === 'markdown'"
        :content="markdownContent"
        label="Markdown"
      />

      <!-- HTML: raw html string via CodeBlock -->
      <CodeBlock
        v-else-if="activeTab === 'html'"
        :content="htmlContent"
        label="HTML"
      />

      <!-- Links: list of discovered links via CodeBlock -->
      <CodeBlock
        v-else-if="activeTab === 'links'"
        :content="linksContent"
        label="Links"
      />

      <!-- Screenshot: rendered image -->
      <div v-else-if="activeTab === 'screenshot'" class="screenshot-pane">
        <img :src="screenshotContent" alt="Page screenshot" />
      </div>

      <!-- Metadata: page metadata object as JSON -->
      <CodeBlock
        v-else-if="activeTab === 'metadata'"
        :json="metadataContent"
        label="Metadata"
      />

      <!-- JSON: the full result object -->
      <CodeBlock v-else :json="result" label="JSON" />
    </template>

    <!-- Response actions: copy current tab payload + download menu -->
    <template #response-actions="{ activeTab }">
      <CopyButton v-if="activeTab === 'json'" :text="resultJson" label="Copy JSON" />
      <CopyButton
        v-else-if="activeTab === 'markdown'"
        :text="markdownContent"
        label="Copy"
      />
      <CopyButton v-else-if="activeTab === 'html'" :text="htmlContent" label="Copy" />
      <CopyButton v-else-if="activeTab === 'links'" :text="linksContent" label="Copy" />
    </template>
  </PlaygroundLayout>
</template>

<script lang="ts">
import { defineComponent, ref, inject, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { FirecrawlScrapingApi } from '../services/firecrawl';
import PlaygroundLayout from '../components/playground/PlaygroundLayout.vue';
import CodeBlock from '../components/playground/CodeBlock.vue';
import CopyButton from '../components/playground/CopyButton.vue';

type ScrapeResult = {
  success: boolean;
  data: Record<string, unknown>;
};

/**
 * @typedef {object} FormDataPageOptions
 * @property {number} [waitFor] - Delay before fetching content in milliseconds.
 * @property {boolean} [mobile] - Emulate mobile device.
 * @property {boolean} [skipTlsVerification] - Skip TLS verification.
 * @property {number} [timeout] - Page request timeout in milliseconds.
 * @property {boolean} [blockAds] - Block ads and popups.
 * @property {boolean} [removeBase64Images] - Remove Base64 encoded images.
 * @property {number} [maxAge] - Use cached page if younger than this age in milliseconds.
 * @property {boolean} [parsePDF] - Parse PDF files instead of returning base64.
 * @property {boolean} [storeInCache] - Store the page in Firecrawl cache.
 * @property {'basic' | 'stealth' | 'enhanced' | 'auto' | ''} [proxy] - Proxy type for the request.
 * @property {Record<string, string>} [headers] - HTTP headers as a JSON object.
 * @property {string} [action] - HTTP method for the request (e.g., 'GET', 'POST').
 * @property {string} [location] - Request location (e.g., 'US', 'EU', 'ASIA').
 * @property {any[]} [actions] - Actions to perform on the page prior to scraping.
 */
interface FormDataPageOptions {
  waitFor?: number;
  mobile?: boolean;
  skipTlsVerification?: boolean;
  timeout?: number;
  blockAds?: boolean;
  removeBase64Images?: boolean;
  maxAge?: number;
  parsePDF?: boolean;
  storeInCache?: boolean;
  proxy?: 'basic' | 'stealth' | 'enhanced' | 'auto' | '';
  headers?: Record<string, string>;
  action?: string;
  location?: string;
  actions?: any[];
}

/**
 * @typedef {object} FormDataScrapeOptions
 * @property {string[]} formats - Array of output formats (e.g., "json", "markdown").
 * @property {boolean} [onlyMainContent] - Scrape only the main content, excluding headers, footers, etc.
 * @property {string} [includeTags] - Comma-separated list of HTML tags to include.
 * @property {string} [excludeTags] - Comma-separated list of HTML tags to exclude.
 */
interface FormDataScrapeOptions {
  formats: string[];
  onlyMainContent?: boolean;
  includeTags?: string;
  excludeTags?: string;
}

/**
 * @typedef {object} FormDataExtractorOptions
 * @description Extractor options for JSON format, extending the API request structure.
 */
interface FormDataExtractorOptions {
  prompt?: string;
  schema?: Record<string, unknown>;
}

/**
 * @typedef {object} FormDataAttributesOptions
 * @property {Array<{selector: string, attribute: string}>} selectors - Attribute selectors to extract.
 */
interface FormDataAttributesOptions {
  selectors?: Array<{
    selector: string;
    attribute: string;
  }>;
}

/**
 * @typedef {object} FormDataChangeTrackingOptions
 * @property {number} threshold - Minimum percentage change to trigger tracking.
 * @property {number} frequency - Frequency in minutes to check for changes.
 */
interface FormDataChangeTrackingOptions {
  threshold: number;
  frequency: number;
}

/**
 * @typedef {object} FormData
 * @property {string} url - The URL to scrape.
 * @property {FormDataPageOptions} pageOptions - Options related to page loading and network requests.
 * @property {FormDataScrapeOptions} scrapeOptions - Options related to content scraping.
 * @property {FormDataExtractorOptions} [extractorOptions] - Options for data extraction when 'json' format is selected.
 * @property {FormDataAttributesOptions} [attributesOptions] - Options for attribute extraction when 'attributes' format is selected.
 * @property {FormDataChangeTrackingOptions} changeTrackingOptions - Options for change tracking.
 */
interface FormData {
  url: string;
  pageOptions: FormDataPageOptions;
  scrapeOptions: FormDataScrapeOptions;
  extractorOptions?: FormDataExtractorOptions;
  attributesOptions?: FormDataAttributesOptions;
  changeTrackingOptions: FormDataChangeTrackingOptions;
}

/**
 * ScrapeView component for configuring and initiating web scraping requests.
 * Allows users to specify a URL, output formats, and various advanced options
 * for page loading, content filtering, data extraction, and change tracking.
 */
export default defineComponent({
  name: 'ScrapeView',
  components: {
    PlaygroundLayout,
    CodeBlock,
    CopyButton,
  },
  /**
   * Setup function for the ScrapeView component.
   * Initializes reactive data, handles form submission, and manages API interactions.
   * @returns {object} Reactive properties and methods for the component.
   */
  setup() {
    const router = useRouter();
    // Inject the API client for scraping operations.
    const api = inject('api') as { scraping: FirecrawlScrapingApi };

    /**
     * Reactive form data for scrape configuration.
     * @type {Ref<FormData>}
     */
    const formData = ref<FormData>({
      url: '',
      pageOptions: {
        waitFor: undefined,
        mobile: false,
        skipTlsVerification: false,
        timeout: undefined,
        maxAge: undefined,
        blockAds: true,
        removeBase64Images: true,
        parsePDF: true,
        storeInCache: true,
        proxy: '',
        headers: {},
        action: 'GET', // Default HTTP action
        location: '',
        actions: [],
      },
      scrapeOptions: {
        onlyMainContent: true,
        formats: ['markdown'],
        includeTags: '',
        excludeTags: '',
      },
      extractorOptions: {},
      attributesOptions: {
        selectors: [],
      },
      changeTrackingOptions: {
        threshold: 10,
        frequency: 60,
      },
    });

    /**
     * Reactive state for collapsing/expanding scrape options section.
     * @type {Ref<boolean>}
     */
    const isScrapeOptionsCollapsed = ref(true);
    /**
     * Reactive state for collapsing/expanding page options section.
     * @type {Ref<boolean>}
     */
    const isPageOptionsCollapsed = ref(true);

    /**
     * Reactive state indicating if a request is in progress.
     * @type {Ref<boolean>}
     */
    const loading = ref(false);
    /**
     * Reactive state for displaying error messages.
     * @type {Ref<string>}
     */
    const error = ref('');
    /**
     * Reactive state for storing the scrape result.
     * @type {Ref<ScrapeResult | null>}
     */
    const result = ref<ScrapeResult | null>(null);

    /**
     * Reactive duration (in milliseconds) of the most recent scrape request,
     * measured around the API call. Null until a request has completed.
     * @type {Ref<number | null>}
     */
    const durationMs = ref<number | null>(null);

    /**
     * Computed property to determine available download formats based on selected scrape formats.
     * Ensures 'json' is always an option if results are present.
     * @returns {string[]} Array of unique download formats.
     */
    const downloadFormats = computed(() =>
      Array.from(new Set(['json', ...formData.value.scrapeOptions.formats])),
    );

    /**
     * The raw `data` object of the current result, or null when there is none.
     * Centralizes the optional-chaining used by the response computeds below.
     * @returns {Record<string, unknown> | null}
     */
    const resultData = computed<Record<string, unknown> | null>(
      () => result.value?.data ?? null,
    );

    /**
     * Pretty-printed JSON of the full result, used by the JSON copy action.
     * @returns {string}
     */
    const resultJson = computed<string>(() =>
      result.value ? JSON.stringify(result.value, null, 2) : '',
    );

    /**
     * Raw markdown string from the result, when present.
     * @returns {string}
     */
    const markdownContent = computed<string>(() => {
      const md = resultData.value?.markdown;
      return typeof md === 'string' ? md : '';
    });

    /**
     * Raw HTML string from the result (prefers `html`, falls back to `rawHtml`).
     * @returns {string}
     */
    const htmlContent = computed<string>(() => {
      const html = resultData.value?.html ?? resultData.value?.rawHtml;
      return typeof html === 'string' ? html : '';
    });

    /**
     * Newline-joined list of discovered links, when present.
     * @returns {string}
     */
    const linksContent = computed<string>(() => {
      const links = resultData.value?.links;
      return Array.isArray(links) ? links.join('\n') : '';
    });

    /**
     * Screenshot data URL from the result, when present.
     * @returns {string}
     */
    const screenshotContent = computed<string>(() => {
      const shot = resultData.value?.screenshot;
      return typeof shot === 'string' ? shot : '';
    });

    /**
     * Page metadata object from the result, when present.
     * @returns {Record<string, unknown> | null}
     */
    const metadataContent = computed<Record<string, unknown> | null>(() => {
      const meta = resultData.value?.metadata;
      return meta && typeof meta === 'object'
        ? (meta as Record<string, unknown>)
        : null;
    });

    /**
     * Text shown in the Preview tab: rendered markdown if available, otherwise
     * the HTML content, otherwise a stringified dump of the result data.
     * @returns {string}
     */
    const previewContent = computed<string>(() => {
      if (markdownContent.value) return markdownContent.value;
      if (htmlContent.value) return htmlContent.value;
      return resultData.value ? JSON.stringify(resultData.value, null, 2) : '';
    });

    /**
     * Response tabs built from what the current result actually contains.
     * Only tabs backed by real data are shown; JSON is always available.
     * @returns {{ key: string; label: string }[]}
     */
    const responseTabs = computed<{ key: string; label: string }[]>(() => {
      const tabs: { key: string; label: string }[] = [];
      if (markdownContent.value || htmlContent.value) {
        tabs.push({ key: 'preview', label: 'Preview' });
      }
      if (markdownContent.value) tabs.push({ key: 'markdown', label: 'Markdown' });
      if (htmlContent.value) tabs.push({ key: 'html', label: 'HTML' });
      if (linksContent.value) tabs.push({ key: 'links', label: 'Links' });
      if (screenshotContent.value) tabs.push({ key: 'screenshot', label: 'Screenshot' });
      if (metadataContent.value) tabs.push({ key: 'metadata', label: 'Metadata' });
      tabs.push({ key: 'json', label: 'JSON' });
      return tabs;
    });

    /**
     * Status label for the playground status bar: reflects success, error, or idle.
     * @returns {string | null}
     */
    const statusLabel = computed<string | null>(() => {
      if (error.value) return 'Failed';
      if (result.value) return 'Success';
      return null;
    });

    /**
     * Semantic status type driving the status-dot color in the playground shell.
     * @returns {'success' | 'error' | 'idle'}
     */
    const statusType = computed<'success' | 'error' | 'idle'>(() => {
      if (error.value) return 'error';
      if (result.value) return 'success';
      return 'idle';
    });

    /**
     * Validates if a given string is a well-formed URL.
     * @param {string} url - The URL string to validate.
     * @returns {boolean} True if the URL is valid, false otherwise.
     */
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    /**
     * Handles the form submission for initiating a scrape request.
     * Validates input, constructs the API payload, and handles API response or errors.
     * @async
     * @returns {Promise<void>}
     */
    const handleSubmit = async (): Promise<void> => {
      if (!isValidUrl(formData.value.url)) {
        error.value = 'Please enter a valid URL (e.g., https://example.com)';
        return;
      }

      if (
        !formData.value.scrapeOptions.formats ||
        formData.value.scrapeOptions.formats.length === 0
      ) {
        error.value = 'Please select at least one output format.';
        return;
      }

      const requestPayload = {
        url: formData.value.url,
        ...(formData.value.pageOptions.waitFor !== undefined &&
          formData.value.pageOptions.waitFor > 0 && {
            waitFor: formData.value.pageOptions.waitFor,
          }),
        ...(formData.value.pageOptions.maxAge !== undefined &&
          formData.value.pageOptions.maxAge > 0 && {
            maxAge: formData.value.pageOptions.maxAge,
          }),
        ...(formData.value.pageOptions.mobile === true && { mobile: true }),
        ...(formData.value.pageOptions.skipTlsVerification === true && {
          skipTlsVerification: true,
        }),
        ...(formData.value.pageOptions.timeout !== undefined &&
          formData.value.pageOptions.timeout > 0 &&
          formData.value.pageOptions.timeout !== 30000 && {
            timeout: formData.value.pageOptions.timeout,
          }),
        ...(formData.value.pageOptions.blockAds === false && {
          blockAds: false,
        }),
        ...(formData.value.pageOptions.removeBase64Images === false && {
          removeBase64Images: false,
        }),
        ...(formData.value.pageOptions.parsePDF === false && { parsePDF: false }),
        ...(formData.value.pageOptions.storeInCache === false && {
          storeInCache: false,
        }),
        ...(formData.value.pageOptions.proxy &&
          formData.value.pageOptions.proxy !== '' && {
            proxy: formData.value.pageOptions.proxy,
          }),
        ...(formData.value.pageOptions.headers &&
          Object.keys(formData.value.pageOptions.headers).length > 0 && {
            headers: formData.value.pageOptions.headers,
          }),
        ...(formData.value.pageOptions.location &&
          formData.value.pageOptions.location !== '' && {
            location: { country: formData.value.pageOptions.location },
          }),
        ...(formData.value.pageOptions.actions &&
          formData.value.pageOptions.actions.length > 0 && {
            actions: formData.value.pageOptions.actions,
          }),

        // Include scrapeOptions properties directly.
        formats: formData.value.scrapeOptions.formats,
        ...(formData.value.scrapeOptions.onlyMainContent === false && {
          onlyMainContent: false,
        }),
        ...(formData.value.scrapeOptions.includeTags &&
          formData.value.scrapeOptions.includeTags.trim() !== '' && {
            includeTags: formData.value.scrapeOptions.includeTags
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag !== ''),
          }),
        ...(formData.value.scrapeOptions.excludeTags &&
          formData.value.scrapeOptions.excludeTags.trim() !== '' && {
            excludeTags: formData.value.scrapeOptions.excludeTags
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag !== ''),
          }),

        // Include extractorOptions and changeTrackingOptions if applicable.
        ...(formData.value.scrapeOptions.formats.includes('json') &&
          formData.value.extractorOptions &&
          Object.keys(formData.value.extractorOptions).length > 0 && {
            extract: formData.value.extractorOptions,
          }),
        ...(formData.value.scrapeOptions.formats.includes('attributes') &&
          formData.value.attributesOptions?.selectors &&
          formData.value.attributesOptions.selectors.length > 0 && {
            attributesOptions: formData.value.attributesOptions,
          }),
        ...(formData.value.scrapeOptions.formats.includes('changeTracking') && {
          changeTrackingOptions: {
            threshold: formData.value.changeTrackingOptions?.threshold ?? 10,
            frequency: formData.value.changeTrackingOptions?.frequency ?? 60,
          },
        }),
      };

      // Record the request start time to compute elapsed duration on resolve.
      const startedAt = performance.now();
      try {
        loading.value = true;
        error.value = '';
        console.log('Sending scrape request:', JSON.stringify(requestPayload, null, 2));
        const response = await api.scraping.scrapeAndExtractFromUrl(requestPayload);
        result.value = response.data;
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('401')) {
            router.push({ name: 'ApiConfig' });
            return;
          }
          error.value = err.message.includes('404')
            ? 'Page not found (404)'
            : err.message.includes('Network Error')
              ? 'Network connection failed'
              : err.message;
        } else {
          error.value = 'An unexpected error occurred.';
        }
      } finally {
        // Capture how long the request took for the playground status bar.
        durationMs.value = performance.now() - startedAt;
        loading.value = false;
      }
    };

    /**
     * Initiates the download of the scrape result in a specified format.
     * Handles different content types (screenshot, markdown, HTML, JSON).
     * @param {string} format - The desired format for download (e.g., 'json', 'markdown', 'screenshot').
     * @returns {void}
     */
    const downloadResult = (format: string): void => {
      if (!result.value?.data) return;

      // Map specific format names to their corresponding data keys in the result.
      const formatMap: Record<string, string> = {
        json: 'llm_extraction',
        'screenshot@fullPage': 'screenshot',
      };

      const key = formatMap[format] ?? format;
      const data: unknown = result.value.data[key as keyof typeof result.value.data];

      // Handle screenshot download separately as it's a data URL.
      if (format.startsWith('screenshot') && typeof data === 'string') {
        const link = document.createElement('a');
        link.href = data;
        link.setAttribute('download', `scrape-result-${format}.png`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (data === undefined) return;

      let mimeType = 'application/json';
      let extension = 'json';
      let contentStr = '';

      // Determine MIME type and extension based on format.
      if (typeof data === 'string') {
        contentStr = data;
        if (format === 'markdown') {
          mimeType = 'text/markdown';
          extension = 'md';
        } else if (format === 'html' || format === 'rawHtml') {
          mimeType = 'text/html';
          extension = 'html';
        } else {
          mimeType = 'text/plain';
          extension = 'txt';
        }
      } else {
        // Stringify JSON data for download.
        contentStr = JSON.stringify(data, null, 2);
      }

      // Create a Blob and a download link for the content.
      const dataUri = `data:${mimeType};charset=utf-8,${encodeURIComponent(contentStr)}`;
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `scrape-result-${format}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    /**
     * Reactive variable for the JSON string of extractor options.
     * @type {Ref<string>}
     */
    const extractorOptionsJson = ref(
      JSON.stringify(formData.value.extractorOptions || {}, null, 2),
    );
    /**
     * Reactive variable for displaying extractor options JSON parsing errors.
     * @type {Ref<string>}
     */
    const extractorOptionsError = ref('');

    /**
     * Watcher for `extractorOptionsJson` to parse and update `formData.extractorOptions`.
     * Sets an error message if parsing fails.
     */
    watch(
      extractorOptionsJson,
      (newVal) => {
        try {
          formData.value.extractorOptions = newVal ? JSON.parse(newVal) : {};
          extractorOptionsError.value = '';
        } catch (e: any) {
          extractorOptionsError.value = `Invalid JSON: ${e.message}`;
        }
      },
      { immediate: true },
    );

    /**
     * Reactive variable for the JSON string of attribute selectors.
     * @type {Ref<string>}
     */
    const attributesOptionsJson = ref(
      JSON.stringify(formData.value.attributesOptions?.selectors || [], null, 2),
    );
    /**
     * Reactive variable for displaying attribute selector JSON parsing errors.
     * @type {Ref<string>}
     */
    const attributesOptionsError = ref('');

    /**
     * Watcher for `attributesOptionsJson` to parse and update `formData.attributesOptions`.
     * Provides real-time validation for JSON input.
     */
    watch(attributesOptionsJson, (newVal) => {
      try {
        const parsedValue = newVal ? JSON.parse(newVal) : [];
        formData.value.attributesOptions = {
          selectors: Array.isArray(parsedValue) ? parsedValue : [],
        };
        attributesOptionsError.value = '';
      } catch {
        attributesOptionsError.value = 'Invalid JSON format.';
      }
    });

    /**
     * Reactive variable for the JSON string of HTTP headers.
     * @type {Ref<string>}
     */
    const headersJson = ref(JSON.stringify(formData.value.pageOptions.headers || {}, null, 2));
    /**
     * Reactive variable for displaying HTTP headers JSON parsing errors.
     * @type {Ref<string>}
     */
    const headersError = ref('');

    /**
     * Watcher for `headersJson` to parse and update `formData.pageOptions.headers`.
     * Sets an error message when the JSON is invalid.
     */
    watch(
      headersJson,
      (newVal) => {
        try {
          formData.value.pageOptions.headers = newVal ? JSON.parse(newVal) : {};
          headersError.value = '';
        } catch (e: any) {
          headersError.value = `Invalid JSON: ${e.message}`;
        }
      },
      { immediate: true },
    );

    /**
     * Available action types for dynamic actions list.
     */
    const actionTypes = [
      'wait',
      'screenshot',
      'click',
      'write',
      'press',
      'scroll',
      'scrape',
      'executeJavascript',
    ];

    /**
     * Add a new action with default values.
     */
    const addAction = (): void => {
      formData.value.pageOptions.actions.push({ type: actionTypes[0] });
    };

    /**
     * Remove an action at a specified index.
     * @param {number} idx - Index of the action to remove.
     */
    const removeAction = (idx: number): void => {
      formData.value.pageOptions.actions.splice(idx, 1);
    };

    return {
      formData,
      loading,
      headersJson,
      headersError,
      error,
      result,
      handleSubmit,
      downloadResult,
      downloadFormats,
      extractorOptionsJson,
      extractorOptionsError,
      attributesOptionsJson,
      attributesOptionsError,
      actionTypes,
      addAction,
      removeAction,
      isScrapeOptionsCollapsed,
      isPageOptionsCollapsed,
      // Playground-specific reactive helpers.
      durationMs,
      responseTabs,
      statusLabel,
      statusType,
      resultJson,
      markdownContent,
      htmlContent,
      linksContent,
      screenshotContent,
      metadataContent,
      previewContent,
    };
  },
});
</script>

<style scoped>
.form-group {
  margin-bottom: 20px; /* Increased margin */
}
.options-fieldset {
  /* Card-like surface consistent with the Ember design system */
  border: 1px solid var(--color-border);
  padding: 15px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}
.options-fieldset legend {
  font-weight: bold;
  padding: 0 5px;
}
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); /* Responsive grid */
  gap: 15px; /* Gap between grid items */
}
.checkbox-label {
  /* Style for labels containing checkboxes */
  display: flex;
  align-items: center;
  gap: 5px;
}
.form-group small {
  /* Style for help text */
  display: block;
  font-size: 0.8em;
  color: var(--color-text-mute);
  margin-top: 3px;
}

.collapsible-header {
  cursor: pointer;
}

/* Inline validation error text */
.error-message {
  color: var(--hue-danger);
  font-size: 0.9em;
  margin-top: 5px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
}

/* Preview pane: wrapped monospace dump of the rendered content. */
.preview-pane {
  height: 100%;
  overflow: auto;
}

.preview-pane pre {
  margin: 0;
  padding: 1rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: var(--font-mono);
  font-size: 0.84rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-background);
}

/* Screenshot pane: centered, scrollable image surface. */
.screenshot-pane {
  height: 100%;
  overflow: auto;
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: var(--color-background);
}

.screenshot-pane img {
  max-width: 100%;
  height: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
</style>
