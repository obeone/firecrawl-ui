<template>
  <div class="page-container">
    <h1>Crawl Configuration</h1>
    <form class="scrape-config-form" @submit.prevent="handleSubmit">
      <!-- URL Section -->
      <div class="form-group">
        <label for="url">Base URL to Crawl:</label>
        <input
          id="url"
          v-model="formData.url"
          type="text"
          required
          placeholder="https://example.com"
        />
      </div>

      <!-- Crawler Options Section -->
      <fieldset class="form-group options-fieldset">
        <legend
          class="collapsible-header"
          @click="isCrawlerOptionsCollapsed = !isCrawlerOptionsCollapsed"
        >
          {{ crawlerOptionsArrow }} Crawler Options
        </legend>
        <div v-show="!isCrawlerOptionsCollapsed">
          <div class="grid-layout">
            <div class="form-group">
              <label for="includes">Includes (Regex Patterns):</label>
              <input
                id="includes"
                v-model="includesInput"
                type="text"
                placeholder="/blog/.*, /products/.*"
                @blur="parseIncludes"
              />
              <small>Comma-separated regex patterns. Only matching URLs will be included.</small>
            </div>
            <div class="form-group">
              <label for="excludes">Excludes (Regex Patterns):</label>
              <input
                id="excludes"
                v-model="excludesInput"
                type="text"
                placeholder="/login, /private/.*"
                @blur="parseExcludes"
              />
              <small>Comma-separated regex patterns to exclude URLs.</small>
            </div>
            <div class="form-group">
              <label for="maxDepth">Max Depth:</label>
              <input
                id="maxDepth"
                v-model.number="formData.crawlerOptions.maxDepth"
                type="number"
                min="1"
                placeholder="e.g. 3"
              />
              <small>Maximum depth relative to the base URL (path segments).</small>
            </div>
            <div class="form-group">
              <label for="maxDiscoveryDepth">Max Discovery Depth:</label>
              <input
                id="maxDiscoveryDepth"
                v-model.number="formData.crawlerOptions.maxDiscoveryDepth"
                type="number"
                min="1"
                placeholder="e.g. 2"
              />
              <small>Maximum depth based on discovery order.</small>
            </div>
            <div class="form-group">
              <label for="limit">Page Limit:</label>
              <input
                id="limit"
                v-model.number="formData.crawlerOptions.limit"
                type="number"
                min="1"
                placeholder="e.g. 100"
              />
              <small>Maximum number of pages to crawl (default: 10000).</small>
            </div>
            <div class="form-group">
              <label for="delay">Delay (seconds):</label>
              <input
                id="delay"
                v-model.number="formData.crawlerOptions.delay"
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 1.5"
              />
              <small>Delay between pages to respect rate limits.</small>
            </div>
          </div>
          <div class="grid-layout">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.crawlerOptions.ignoreSitemap" />
              Ignore Sitemap
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.crawlerOptions.ignoreQueryParameters" />
              Ignore Query Parameters
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.crawlerOptions.allowExternalLinks" />
              Allow External Links
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.crawlerOptions.navigateBacklinks" />
              Navigate Backlinks
            </label>
          </div>
        </div>
      </fieldset>

      <!-- Scrape Options Section -->
      <fieldset class="form-group options-fieldset">
        <legend
          class="collapsible-header"
          @click="isScrapeOptionsCollapsed = !isScrapeOptionsCollapsed"
        >
          {{ scrapeOptionsArrow }} Scrape Options
        </legend>
        <div v-show="!isScrapeOptionsCollapsed">
          <div class="form-group">
            <label for="formats">Output Formats:</label>
            <select id="formats" v-model="formData.scrapeOptions.formats" multiple>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="rawHtml">Raw HTML</option>
              <option value="links">Links</option>
              <option value="screenshot">Screenshot (Viewport)</option>
              <option value="screenshot@fullPage">Screenshot (Full Page)</option>
              <option value="json">JSON</option>
              <option value="changeTracking">Change Tracking</option>
            </select>
            <small>Select one or more formats.</small>
          </div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.scrapeOptions.onlyMainContent" />
            Only Main Content (exclude headers, footers, etc.)
          </label>
          <div class="form-group">
            <label for="includeTags">Include Tags (CSS Selectors):</label>
            <input
              id="includeTags"
              v-model="includeTagsInput"
              type="text"
              placeholder="article, .main-content"
              @blur="parseIncludeTags"
            />
            <small
              >Comma-separated CSS selectors. Only content within these tags will be
              included.</small
            >
          </div>
          <div class="form-group">
            <label for="excludeTags">Exclude Tags (CSS Selectors):</label>
            <input
              id="excludeTags"
              v-model="excludeTagsInput"
              type="text"
              placeholder="footer, .sidebar"
              @blur="parseExcludeTags"
            />
            <small>Comma-separated CSS selectors to exclude content within these tags.</small>
          </div>
          <div class="form-group">
            <label for="timeout">Timeout (ms):</label>
            <input
              id="timeout"
              v-model.number="formData.scrapeOptions.timeout"
              type="number"
              min="0"
            />
          </div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.scrapeOptions.skipTlsVerification" />
            Skip TLS Verification
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.scrapeOptions.blockAds" />
            Block Ads
          </label>
          <div class="form-group">
            <label for="proxy">Proxy:</label>
            <select id="proxy" v-model="formData.scrapeOptions.proxy">
              <option value="">Default</option>
              <option value="basic">Basic</option>
              <option value="stealth">Stealth</option>
            </select>
          </div>
          <div class="form-group">
            <label for="locationCountry">Location Country:</label>
            <input
              id="locationCountry"
              v-model="formData.scrapeOptions.location.country"
              type="text"
              placeholder="US"
            />
          </div>
          <div class="form-group">
            <label for="locationLanguages">Location Languages:</label>
            <input
              id="locationLanguages"
              v-model="locationLanguagesInput"
              type="text"
              placeholder="en-US, fr"
              @blur="parseLocationLanguages"
            />
          </div>
          <div class="form-group">
            <label for="jsonSchema">JSON Options Schema (JSON):</label>
            <textarea
              id="jsonSchema"
              v-model="jsonOptionsSchemaInput"
              @blur="parseJsonOptionsSchema"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="jsonSystemPrompt">JSON System Prompt:</label>
            <textarea
              id="jsonSystemPrompt"
              v-model="formData.scrapeOptions.jsonOptions.systemPrompt"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="jsonPrompt">JSON Prompt:</label>
            <textarea
              id="jsonPrompt"
              v-model="formData.scrapeOptions.jsonOptions.prompt"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="changeModes">Change Tracking Modes:</label>
            <input
              id="changeModes"
              v-model="changeTrackingModesInput"
              type="text"
              placeholder="git-diff, json"
              @blur="parseChangeTrackingModes"
            />
          </div>
          <div class="form-group">
            <label for="changeSchema">Change Tracking Schema (JSON):</label>
            <textarea
              id="changeSchema"
              v-model="changeTrackingSchemaInput"
              @blur="parseChangeTrackingSchema"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="changePrompt">Change Tracking Prompt:</label>
            <textarea
              id="changePrompt"
              v-model="formData.scrapeOptions.changeTrackingOptions.prompt"
            ></textarea>
          </div>
        </div>
      </fieldset>

      <!-- Webhook Options Section -->
      <fieldset class="form-group options-fieldset">
        <legend
          class="collapsible-header"
          @click="isWebhookOptionsCollapsed = !isWebhookOptionsCollapsed"
        >
          {{ webhookOptionsArrow }} Webhook Options (Optional)
        </legend>
        <div v-show="!isWebhookOptionsCollapsed">
          <div class="grid-layout">
            <div class="form-group">
              <label for="webhookUrl">Webhook URL:</label>
              <input
                id="webhookUrl"
                v-model="formData.webhookOptions.url"
                type="text"
                placeholder="https://your-service.com/webhook"
              />
            </div>
            <div class="form-group">
              <label for="webhookHeaders">Webhook Headers (JSON):</label>
              <textarea
                id="webhookHeaders"
                v-model="webhookHeadersInput"
                placeholder='{"Authorization": "token"}'
                @blur="parseWebhookHeaders"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="webhookMetadata">Webhook Metadata (JSON):</label>
              <textarea
                id="webhookMetadata"
                v-model="webhookMetadataInput"
                placeholder='{"source": "ui"}'
                @blur="parseWebhookMetadata"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="webhookEvents">Webhook Events:</label>
              <select id="webhookEvents" v-model="formData.webhookOptions.events" multiple>
                <option value="completed">Completed</option>
                <option value="page">Page</option>
                <option value="failed">Failed</option>
                <option value="started">Started</option>
              </select>
            </div>
          </div>
        </div>
      </fieldset>

      <button type="submit" class="primary-button">Submit Crawl</button>
    </form>

    <div v-if="loading" class="status loading">
      <div class="spinner"></div>
      <span>Processing your request...</span>
    </div>

    <div v-if="error" class="status error">
      <div class="error-icon">!</div>
      <div>
        <h3>Error occurred</h3>
        <p>{{ error }}</p>
        <button class="primary-button" @click="error = ''">Try again</button>
      </div>
    </div>

    <!-- Section for active crawl status -->
    <div v-if="crawling" class="crawl-status-section">
      <h2>Crawl Status</h2>
      <p>Status: {{ crawlStatus }}</p>
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
      <p>{{ progress }}% Completed</p>
      <p>{{ pagesCompleted }} / {{ totalPages }} pages processed</p>
    </div>

    <!-- Section for download options after crawl completion -->
    <div v-if="progress === 100 && crawlStatus === 'completed'" class="download-section">
      <h2>Download Results</h2>
      <div class="download-buttons">
        <label class="checkbox-label">
          <input type="checkbox" v-model="useSubfolders" />
          Use subfolders
        </label>
        <template v-for="fmt in activeFormats" :key="fmt">
          <button class="download-button" @click="handleDownload(fmt)">
            Download {{ fmt }} Archive
          </button>
          <button
            v-if="fmt === 'markdown'"
            class="download-button"
            @click="handleDownloadCompiledMarkdown()"
          >
            Download compiled Markdown
          </button>
        </template>
        <button class="download-button" @click="handleDownload('Full JSON')">
          Download Full JSON
        </button>
      </div>
    </div>

    <!-- Section for selected crawl details -->
    <div v-if="selectedCrawl" class="selected-crawl-details-section">
      <h2>Details for Crawl ID: {{ selectedCrawl.id }}</h2>
      <p><strong>URL:</strong> {{ selectedCrawl.url }}</p>
      <p>
        <strong>Date:</strong>
        {{ new Date(selectedCrawl.createdAt).toLocaleString() }}
      </p>
      <p><strong>Status:</strong> {{ selectedCrawl.status }}</p>

      <h3>Files</h3>
      <ul>
        <li v-for="file in simulatedFiles" :key="file">{{ file }}</li>
      </ul>

      <div class="download-section">
        <h3>Download Results</h3>
        <div class="download-buttons">
          <label class="checkbox-label">
            <input type="checkbox" v-model="useSubfolders" />
            Use subfolders
          </label>
          <template v-for="fmt in selectedFormats" :key="fmt">
            <button class="download-button" @click="handleDownload(fmt, selectedCrawl.id)">
              Download {{ fmt }} Archive
            </button>
            <button
              v-if="fmt === 'markdown'"
              class="download-button"
              @click="handleDownloadCompiledMarkdown(selectedCrawl.id)"
            >
              Download compiled Markdown
            </button>
          </template>
          <button class="download-button" @click="handleDownload('Full JSON', selectedCrawl.id)">
            Download Full JSON
          </button>
        </div>
      </div>

      <button class="primary-button" @click="selectedCrawlId = null">Hide Details</button>
    </div>

    <!-- Section for crawl history -->
    <div class="crawl-history-section">
      <h2>Crawl History</h2>
      <div v-if="crawlHistory.length > 0">
        <ul class="history-list">
          <li
            v-for="crawl in crawlHistory"
            :key="crawl.id"
            :class="['history-item', { 'selected-crawl': selectedCrawlId === crawl.id }]"
          >
            <span class="history-info">
              <strong>{{ crawl.url }}</strong>
              – {{ new Date(crawl.createdAt).toLocaleString() }} – Status: {{ crawl.status }}
            </span>
            <button class="history-button" type="button" @click.prevent="selectCrawl(crawl.id)">
              View
            </button>
          </li>
        </ul>
      </div>
      <div v-else>
        <p>No crawl history available.</p>
      </div>
      <div class="clear-history-wrapper">
        <button class="primary-button" type="button" @click="clearHistory">Clear History</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, inject, onMounted, onUnmounted, computed } from 'vue';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { useRouter } from 'vue-router';
// Import the crawling API client (adjust import path as needed)
import {
  type BillingApi,
  type CrawlingApi,
  type ExtractionApi,
  type MappingApi,
  type ScrapingApi,
} from '../api-client/api';

/**
 * Interface for Crawler Options section of the form.
 */
interface CrawlerOptions {
  includes?: string[];
  excludes?: string[];
  maxDepth?: number;
  maxDiscoveryDepth?: number;
  ignoreSitemap?: boolean;
  ignoreQueryParameters?: boolean;
  limit?: number;
  delay?: number;
  allowExternalLinks?: boolean;
  navigateBacklinks?: boolean;
}

/**
 * Interface for Scrape Options section of the form.
 */
interface ScrapeOptions {
  formats: string[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  // Properties from PageOptions moved here to match CrawlUrlsRequestScrapeOptions
  headers?: object;
  waitFor?: number;
  mobile?: boolean;
  removeBase64Images?: boolean;
  actions?: any[]; // Based on OpenAPI, actions is an array of Action objects
  skipTlsVerification?: boolean;
  timeout?: number;
  jsonOptions?: {
    schema?: object;
    systemPrompt?: string;
    prompt?: string;
  };
  location?: {
    country?: string;
    languages?: string[];
  };
  blockAds?: boolean;
  proxy?: string;
  changeTrackingOptions?: {
    modes?: string[];
    schema?: object;
    prompt?: string;
  };
}

/**
 * Interface for Webhook Options section of the form.
 */
interface WebhookOptions {
  url?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  events?: string[];
}

/**
 * Main form data interface for the CrawlView.
 */
interface FormData {
  url: string;
  crawlerOptions: CrawlerOptions;
  scrapeOptions: ScrapeOptions;
  webhookOptions: WebhookOptions;
}

/**
 * Component allowing users to configure and run crawl jobs.
 *
 * @returns Component options for the crawl view.
 */
export default defineComponent({
  name: 'CrawlView',
  setup() {
    const router = useRouter();
    // Define the type of the injected api object based on the structure provided in src/plugins/api.ts
    const api = inject('api') as {
      billing: BillingApi;
      crawling: CrawlingApi;
      extraction: ExtractionApi;
      mapping: MappingApi;
      scraping: ScrapingApi;
    };

    // Reactive form data with explicit defaults to avoid undefined values.
    // Use undefined where appropriate to satisfy TypeScript types.
    const formData = ref<FormData>({
      url: '',
      crawlerOptions: {
        includes: [],
        excludes: [],
        maxDepth: undefined,
        maxDiscoveryDepth: undefined,
        ignoreSitemap: false,
        ignoreQueryParameters: false,
        limit: undefined,
        delay: undefined,
        allowExternalLinks: false,
        navigateBacklinks: false,
      },
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
        includeTags: [],
        excludeTags: [],
        headers: {},
        waitFor: undefined,
        mobile: false,
        removeBase64Images: false,
        actions: [],
        skipTlsVerification: false,
        timeout: undefined,
        jsonOptions: {},
        location: { country: undefined, languages: [] },
        blockAds: true,
        proxy: undefined,
        changeTrackingOptions: {},
      },
      webhookOptions: {
        url: undefined,
        headers: {},
        metadata: {},
        events: [],
      },
    });

    // Inputs for includes/excludes as comma-separated strings for user convenience
    const includesInput = ref('');
    const excludesInput = ref('');
    const includeTagsInput = ref('');
    const excludeTagsInput = ref('');
    const webhookHeadersInput = ref('');
    const webhookMetadataInput = ref('');
    const locationLanguagesInput = ref('');
    const jsonOptionsSchemaInput = ref('');
    const changeTrackingSchemaInput = ref('');
    const changeTrackingModesInput = ref('');

    // State for collapsible sections
    const isCrawlerOptionsCollapsed = ref(true);
    const isScrapeOptionsCollapsed = ref(true);
    const isWebhookOptionsCollapsed = ref(true);
    const useSubfolders = ref(false);

    const crawlerOptionsArrow = computed(() => (isCrawlerOptionsCollapsed.value ? '▶' : '▼'));
    const scrapeOptionsArrow = computed(() => (isScrapeOptionsCollapsed.value ? '▶' : '▼'));
    const webhookOptionsArrow = computed(() => (isWebhookOptionsCollapsed.value ? '▶' : '▼'));

    /**
     * Parses a comma-separated string of regex patterns from the includes input
     * and updates the formData.crawlerOptions.includes array.
     */
    const parseIncludes = () => {
      formData.value.crawlerOptions.includes = includesInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    /**
     * Parses a comma-separated string of regex patterns from the excludes input
     * and updates the formData.crawlerOptions.excludes array.
     */
    const parseExcludes = () => {
      formData.value.crawlerOptions.excludes = excludesInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    /**
     * Parses a comma-separated string of CSS selectors from the includeTags input
     * and updates the formData.scrapeOptions.includeTags array.
     */
    const parseIncludeTags = () => {
      formData.value.scrapeOptions.includeTags = includeTagsInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    /**
     * Parses a comma-separated string of CSS selectors from the excludeTags input
     * and updates the formData.scrapeOptions.excludeTags array.
     */
    const parseExcludeTags = () => {
      formData.value.scrapeOptions.excludeTags = excludeTagsInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    /**
     * Parses the webhookHeadersInput string as JSON and updates
     * formData.webhookOptions.headers. Sets an error message if parsing fails.
     */
    const parseWebhookHeaders = () => {
      try {
        formData.value.webhookOptions.headers = webhookHeadersInput.value
          ? JSON.parse(webhookHeadersInput.value)
          : {};
      } catch (e: any) {
        error.value = `Invalid JSON for webhook headers: ${e.message}`;
      }
    };

    /**
     * Parses the webhookMetadataInput string as JSON and updates
     * formData.webhookOptions.metadata. Sets an error message if parsing fails.
     */
    const parseWebhookMetadata = () => {
      try {
        formData.value.webhookOptions.metadata = webhookMetadataInput.value
          ? JSON.parse(webhookMetadataInput.value)
          : {};
      } catch (e: any) {
        error.value = `Invalid JSON for webhook metadata: ${e.message}`;
      }
    };

    /**
     * Parses a comma-separated string of languages from the locationLanguagesInput
     * and updates the formData.scrapeOptions.location.languages array.
     */
    const parseLocationLanguages = () => {
      formData.value.scrapeOptions.location = formData.value.scrapeOptions.location || {};
      formData.value.scrapeOptions.location.languages = locationLanguagesInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    /**
     * Parses the jsonOptionsSchemaInput string as JSON and updates
     * formData.scrapeOptions.jsonOptions.schema. Sets an error message if parsing fails.
     */
    const parseJsonOptionsSchema = () => {
      try {
        formData.value.scrapeOptions.jsonOptions = formData.value.scrapeOptions.jsonOptions || {};
        formData.value.scrapeOptions.jsonOptions.schema = jsonOptionsSchemaInput.value
          ? JSON.parse(jsonOptionsSchemaInput.value)
          : undefined;
      } catch (e: any) {
        error.value = `Invalid JSON for JSON schema: ${e.message}`;
      }
    };

    /**
     * Parses the changeTrackingSchemaInput string as JSON and updates
     * formData.scrapeOptions.changeTrackingOptions.schema. Sets an error message if parsing fails.
     */
    const parseChangeTrackingSchema = () => {
      try {
        formData.value.scrapeOptions.changeTrackingOptions =
          formData.value.scrapeOptions.changeTrackingOptions || {};
        formData.value.scrapeOptions.changeTrackingOptions.schema = changeTrackingSchemaInput.value
          ? JSON.parse(changeTrackingSchemaInput.value)
          : undefined;
      } catch (e: any) {
        error.value = `Invalid JSON for change tracking schema: ${e.message}`;
      }
    };

    /**
     * Parses a comma-separated string of modes from the changeTrackingModesInput
     * and updates the formData.scrapeOptions.changeTrackingOptions.modes array.
     */
    const parseChangeTrackingModes = () => {
      formData.value.scrapeOptions.changeTrackingOptions =
        formData.value.scrapeOptions.changeTrackingOptions || {};
      formData.value.scrapeOptions.changeTrackingOptions.modes = changeTrackingModesInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    const loading = ref(false);
    const crawling = ref(false);
    const progress = ref(0);
    // Number of pages processed so far
    const pagesCompleted = ref(0);
    // Total number of pages in the crawl job
    const totalPages = ref(0);
    const crawlStatus = ref<string | undefined>('');
    const error = ref('');
    const result = ref<any>(null);
    const crawlHistory = ref<any[]>([]); // Initialize with empty array

    // State for selected crawl history item
    const selectedCrawlId = ref<string | null>(null);
    const simulatedFiles = ref<string[]>([]);

    // LocalStorage key for crawl history
    const HISTORY_STORAGE_KEY = 'crawlHistory';

    // Computed property to get the selected crawl details
    const selectedCrawl = computed(() => {
      return crawlHistory.value.find((crawl) => crawl.id === selectedCrawlId.value);
    });

    /**
     * Get the formats requested for the active crawl.
     * These are taken from the history entry for the current job ID.
     * @returns {string[]} An array of active formats.
     */
    const activeFormats = computed((): string[] => {
      if (result.value && result.value.id) {
        const historyItem = crawlHistory.value.find((c) => c.id === result.value.id);
        return historyItem?.scrapeOptions?.formats || [];
      }
      return [];
    });

    /**
     * Get the formats requested for the selected crawl history item.
     * @returns {string[]} An array of selected formats.
     */
    const selectedFormats = computed((): string[] => {
      if (selectedCrawl.value) {
        return selectedCrawl.value.scrapeOptions?.formats || [];
      }
      return [];
    });

    /**
     * Save the current crawl history to LocalStorage.
     */
    const saveHistory = () => {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(crawlHistory.value));
    };

    /**
     * Clear the crawl history and remove the stored data.
     */
    const clearHistory = () => {
      crawlHistory.value = [];
      selectedCrawlId.value = null;
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    };

    /**
     * Select a crawl from history and sync form fields.
     * Retrieves file names from the API instead of file content.
     * @param {string} id - The ID of the selected crawl.
     */
    const selectCrawl = async (id: string) => {
      selectedCrawlId.value = id;
      simulatedFiles.value = [];
      error.value = '';

      try {
        // Fetch files for the selected crawl via the API
        const response = await api.crawling.getCrawlStatus(id);
        simulatedFiles.value =
          response.data.data?.map((page: any, index: number) => {
            const base = sanitizeFilename(page.metadata?.sourceURL || page.url || index.toString());
            return `${index.toString().padStart(3, '0')}-${base}`;
          }) || [];
        console.log(`Fetched files for crawl ID: ${id}`, response.data);

        // Sync text inputs with values from the selected crawl if available
        const crawl = crawlHistory.value.find((c) => c.id === id);
        if (crawl && crawl.crawlerOptions) {
          includesInput.value = (crawl.crawlerOptions.includes || []).join(', ');
          excludesInput.value = (crawl.crawlerOptions.excludes || []).join(', ');
        }
        if (crawl && crawl.scrapeOptions) {
          includeTagsInput.value = (crawl.scrapeOptions.includeTags || []).join(', ');
          excludeTagsInput.value = (crawl.scrapeOptions.excludeTags || []).join(', ');
          locationLanguagesInput.value = crawl.scrapeOptions.location?.languages?.join(', ') || '';
          jsonOptionsSchemaInput.value = crawl.scrapeOptions.jsonOptions?.schema
            ? JSON.stringify(crawl.scrapeOptions.jsonOptions.schema)
            : '';
          changeTrackingSchemaInput.value = crawl.scrapeOptions.changeTrackingOptions?.schema
            ? JSON.stringify(crawl.scrapeOptions.changeTrackingOptions.schema)
            : '';
          changeTrackingModesInput.value =
            crawl.scrapeOptions.changeTrackingOptions?.modes?.join(', ') || '';
        }
      } catch (err: any) {
        console.error(`Error fetching crawl files for ID ${id}:`, err);
        error.value = `Failed to fetch crawl files for ID ${id}. ${err.message || err}`;
      }
    };

    /**
     * Retrieve all pages for a crawl job, following pagination if necessary.
     * @param {string} jobId - The crawl job identifier.
     * @returns {Promise<any[]>} A promise that resolves to an array of page data objects.
     */
    const fetchAllCrawlData = async (jobId: string): Promise<any[]> => {
      const pages: any[] = [];
      let response = await api.crawling.getCrawlStatus(jobId);
      pages.push(...(response.data.data || []));
      let next = response.data.next;
      while (next) {
        const nextResp = await axios.get(next);
        pages.push(...(nextResp.data.data || []));
        next = nextResp.data.next;
      }
      return pages;
    };

    /**
     * Sanitize a URL so it can be safely used as part of a filename.
     * Replaces protocol, query parameters, hash, and non-alphanumeric characters with underscores.
     * @param {string} url - The URL to sanitize.
     * @returns {string} A filename-safe string derived from the URL.
     */
    function sanitizeFilename(url: string): string {
      let name = url.replace(/^https?:\/\//, '');
      name = name.replace(/[?#].*$/, '');
      name = name.replace(/[^a-zA-Z0-9]+/g, '_');
      return name || 'page';
    }

    /**
     * Sanitize a path segment for safe folder or file names.
     *
     * @param segment - The path segment to sanitize.
     * @returns The sanitized segment.
     */
    function sanitizeSegment(segment: string): string {
      return segment.replace(/[^a-zA-Z0-9]+/g, '_') || 'part';
    }

    /**
     * Get folder structure and file name for a URL.
     *
     * @param url - The source URL.
     * @param ext - The desired file extension.
     * @returns Folder segments and final file name.
     */
    function getPathInfo(url: string, ext: string): { folders: string[]; filename: string } {
      try {
        const { pathname } = new URL(url);
        const trimmed = pathname.replace(/\/+$/, '');
        const segments = trimmed.split('/').filter(Boolean).map(sanitizeSegment);
        if (segments.length === 0) {
          return { folders: [], filename: `index.${ext}` };
        }
        let last = segments[segments.length - 1];
        if (last.includes('.')) {
          last = last.replace(/\.[^.]+$/, '');
          segments.pop();
        }
        const base = last || 'index';
        return { folders: segments, filename: `${base}.${ext}` };
      } catch {
        return { folders: [], filename: `index.${ext}` };
      }
    }

    /**
     * Map a format to its file extension.
     *
     * @param format - The export format.
     * @returns The corresponding file extension.
     */
    function getExtension(format: string): string {
      switch (format) {
        case 'markdown':
          return 'md';
        case 'html':
          return 'html';
        case 'rawHtml':
          return 'raw.html';
        case 'links':
          return 'txt';
        case 'json':
        case 'changeTracking':
          return 'json';
        case 'screenshot':
        case 'screenshot@fullPage':
          return 'png';
        default:
          return 'txt';
      }
    }

    /**
     * Handles the download of crawl results.
     * Calls the appropriate API endpoint based on the download type ('Archive' or 'Full JSON').
     * Creates a Blob from the response and triggers a file download.
     * @param {string} type - The type of download (e.g., 'markdown', 'html', 'Full JSON').
     * @param {string} [jobIdParam] - Optional job ID to download specific crawl results from history.
     */
    const handleDownload = async (type: string, jobIdParam?: string) => {
      console.log(`Handling download of ${type}.`);
      error.value = '';

      const jobId = jobIdParam || result.value?.id;
      if (!jobId) {
        error.value = 'No crawl job found to download results.';
        console.error('Attempted to download without a crawl job identifier.');
        return;
      }

      try {
        const pages = await fetchAllCrawlData(jobId);

        if (type === 'Full JSON') {
          const blob = new Blob([JSON.stringify(pages, null, 2)], {
            type: 'application/json',
          });
          saveAs(blob, `crawl-result-${jobId}.json`);
          return;
        }

        const zip = new JSZip();
        const fetches: Promise<void>[] = [];

        // Build folder prefix counts to avoid creating single-file folders
        const prefixCounts: Record<string, number> = {};
        pages.forEach((p, i) => {
          const name = p.metadata?.sourceURL || p.url || i.toString();
          const info = getPathInfo(name, getExtension(type));
          let prefix = '';
          info.folders.forEach((seg) => {
            prefix = prefix ? `${prefix}/${seg}` : seg;
            prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
          });
        });

        pages.forEach((page, index) => {
          const urlForName = page.metadata?.sourceURL || page.url || index.toString();
          const base = sanitizeFilename(urlForName);
          const prefix = index.toString().padStart(3, '0');
          const ext = getExtension(type);
          const pathInfo = getPathInfo(urlForName, ext);
          let folderSegments: string[] = [];
          if (useSubfolders.value) {
            let prefixPath = '';
            folderSegments = pathInfo.folders.filter((seg) => {
              prefixPath = prefixPath ? `${prefixPath}/${seg}` : seg;
              return prefixCounts[prefixPath] > 1;
            });
          }
          const addFile = (data: string | Blob) => {
            if (useSubfolders.value && folderSegments.length > 0) {
              let folder = zip;
              folderSegments.forEach((seg) => {
                folder = folder.folder(seg);
              });
              folder.file(pathInfo.filename, data);
            } else {
              zip.file(`${prefix}-${base}.${ext}`, data);
            }
          };
          switch (type) {
            case 'markdown':
              if (page.markdown) {
                addFile(page.markdown);
              }
              break;
            case 'html':
              if (page.html) {
                addFile(page.html);
              }
              break;
            case 'rawHtml':
              if (page.rawHtml) {
                addFile(page.rawHtml);
              }
              break;
            case 'links':
              if (page.links) {
                addFile(page.links.join('\n'));
              }
              break;
            case 'json':
              if (page.llm_extraction) {
                addFile(JSON.stringify(page.llm_extraction, null, 2));
              }
              break;
            case 'changeTracking':
              if (page.changeTracking) {
                addFile(JSON.stringify(page.changeTracking, null, 2));
              }
              break;
            case 'screenshot':
            case 'screenshot@fullPage':
              if (page.screenshot) {
                const p = axios.get(page.screenshot, { responseType: 'blob' }).then((res) => {
                  addFile(res.data);
                });
                fetches.push(p);
              }
              break;
            default:
              console.warn(`Unknown format: ${type}`);
          }
        });

        await Promise.all(fetches);
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `crawl-${type}-archive-${jobId}.zip`);
      } catch (err: any) {
        console.error(`Error during ${type} download for job ID ${jobId}:`, err);
        error.value = `Failed to download ${type}. ${err.message || err}`;
      }
    };

    /**
     * Increase markdown heading levels.
     *
     * @param markdown - The markdown string to modify.
     * @param increment - How many levels to increase.
     * @returns The adjusted markdown string.
     */
    const incrementHeadings = (markdown: string, increment: number): string => {
      return markdown.replace(/^(#{1,6})(?=\s)/gm, (match) => {
        const newLevel = Math.min(6, match.length + increment);
        return '#'.repeat(newLevel);
      });
    };

    /**
     * Compile all markdown pages into a single document.
     *
     * @param pages - Array of page objects containing markdown.
     * @param title - Title for the compiled document.
     * @returns The compiled markdown string.
     */
    const compileMarkdown = (pages: any[], title: string): string => {
      const sections: string[] = [`# ${title}`];
      pages.forEach((page, index) => {
        const pageTitle =
          page.metadata?.title || page.metadata?.sourceURL || page.url || `Page ${index + 1}`;
        sections.push(`\n## ${pageTitle}\n`);
        if (page.markdown) {
          sections.push(incrementHeadings(page.markdown, 1));
        }
      });
      return sections.join('\n');
    };

    /**
     * Download all markdown files compiled into a single document.
     *
     * @param jobIdParam - Optional job ID for history downloads.
     */
    const handleDownloadCompiledMarkdown = async (jobIdParam?: string): Promise<void> => {
      error.value = '';
      const jobId = jobIdParam || result.value?.id;
      if (!jobId) {
        error.value = 'No crawl job found to download results.';
        return;
      }
      try {
        const pages = await fetchAllCrawlData(jobId);
        const compiled = compileMarkdown(pages, 'Compiled Crawl Results');
        const blob = new Blob([compiled], { type: 'text/markdown' });
        saveAs(blob, `crawl-compiled-${jobId}.md`);
      } catch (err: any) {
        console.error(`Error compiling markdown for job ID ${jobId}:`, err);
        error.value = `Failed to compile markdown. ${err.message || err}`;
      }
    };

    /**
     * Validate a URL string.
     * @param {string} url - The URL to validate.
     * @returns {boolean} True if valid, false otherwise.
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
     * Handles the form submission for a crawl job.
     * Parses all input fields, validates the URL and formats,
     * constructs the API payload, calls the crawling API,
     * and manages the UI state (loading, progress, errors, history).
     * @returns {Promise<void>} A promise that resolves when the submission process is complete.
     */
    const handleSubmit = async (): Promise<void> => {
      // Parse all comma-separated inputs and JSON fields before submission
      parseIncludes();
      parseExcludes();
      parseIncludeTags();
      parseExcludeTags();
      parseLocationLanguages();
      parseJsonOptionsSchema();
      parseChangeTrackingSchema();
      parseChangeTrackingModes();
      parseWebhookHeaders();
      parseWebhookMetadata();

      // Basic form validation
      if (!isValidUrl(formData.value.url)) {
        error.value = 'Please enter a valid URL (e.g. https://example.com)';
        return;
      }
      if (
        !formData.value.scrapeOptions.formats ||
        formData.value.scrapeOptions.formats.length === 0
      ) {
        error.value = 'Please select at least one output format';
        return;
      }

      // Build the request payload and only include defined options
      const payload: any = { url: formData.value.url };

      const crawler = formData.value.crawlerOptions;
      if (crawler.excludes && crawler.excludes.length > 0) payload.excludePaths = crawler.excludes;
      if (crawler.includes && crawler.includes.length > 0) payload.includePaths = crawler.includes;
      if (crawler.maxDepth !== undefined) payload.maxDepth = crawler.maxDepth;
      if (crawler.maxDiscoveryDepth !== undefined)
        payload.maxDiscoveryDepth = crawler.maxDiscoveryDepth;
      if (crawler.ignoreSitemap) payload.ignoreSitemap = true;
      if (crawler.ignoreQueryParameters) payload.ignoreQueryParameters = true;
      if (crawler.limit !== undefined) payload.limit = crawler.limit;
      if (crawler.delay !== undefined) payload.delay = crawler.delay;
      if (crawler.navigateBacklinks) payload.allowBackwardLinks = true;
      if (crawler.allowExternalLinks) payload.allowExternalLinks = true;

      const scrape = formData.value.scrapeOptions;
      const scrapePayload: any = {};
      if (scrape.formats && scrape.formats.length > 0) scrapePayload.formats = scrape.formats;
      // Only include onlyMainContent if it's explicitly false, as default is true
      if (scrape.onlyMainContent === false) scrapePayload.onlyMainContent = false;
      if (scrape.includeTags && scrape.includeTags.length > 0)
        scrapePayload.includeTags = scrape.includeTags;
      if (scrape.excludeTags && scrape.excludeTags.length > 0)
        scrapePayload.excludeTags = scrape.excludeTags;
      if (scrape.headers && Object.keys(scrape.headers).length > 0)
        scrapePayload.headers = scrape.headers;
      if (scrape.waitFor !== undefined) scrapePayload.waitFor = scrape.waitFor;
      if (scrape.mobile) scrapePayload.mobile = true;
      if (scrape.removeBase64Images) scrapePayload.removeBase64Images = true;
      if (scrape.actions && scrape.actions.length > 0) scrapePayload.actions = scrape.actions;
      if (scrape.skipTlsVerification) scrapePayload.skipTlsVerification = true;
      if (scrape.timeout !== undefined) scrapePayload.timeout = scrape.timeout;
      if (scrape.jsonOptions) {
        const jsonOpts: any = {};
        if (scrape.jsonOptions.schema) jsonOpts.schema = scrape.jsonOptions.schema;
        if (scrape.jsonOptions.systemPrompt)
          jsonOpts.systemPrompt = scrape.jsonOptions.systemPrompt;
        if (scrape.jsonOptions.prompt) jsonOpts.prompt = scrape.jsonOptions.prompt;
        if (Object.keys(jsonOpts).length > 0) scrapePayload.jsonOptions = jsonOpts;
      }
      if (scrape.location) {
        const loc: any = {};
        if (scrape.location.country) loc.country = scrape.location.country;
        if (scrape.location.languages && scrape.location.languages.length > 0)
          loc.languages = scrape.location.languages;
        if (Object.keys(loc).length > 0) scrapePayload.location = loc;
      }
      // Only include blockAds if it's explicitly false, as default is true
      if (scrape.blockAds === false) scrapePayload.blockAds = false;
      if (scrape.proxy) scrapePayload.proxy = scrape.proxy;
      if (scrape.changeTrackingOptions) {
        const change: any = {};
        if (scrape.changeTrackingOptions.modes && scrape.changeTrackingOptions.modes.length > 0)
          change.modes = scrape.changeTrackingOptions.modes;
        if (scrape.changeTrackingOptions.schema)
          change.schema = scrape.changeTrackingOptions.schema;
        if (scrape.changeTrackingOptions.prompt)
          change.prompt = scrape.changeTrackingOptions.prompt;
        if (Object.keys(change).length > 0) scrapePayload.changeTrackingOptions = change;
      }

      if (Object.keys(scrapePayload).length > 0) payload.scrapeOptions = scrapePayload;

      // Include webhook options only when a URL is provided
      if (formData.value.webhookOptions.url && formData.value.webhookOptions.url !== '') {
        payload.webhook = {
          url: formData.value.webhookOptions.url,
        } as any;

        if (
          formData.value.webhookOptions.headers &&
          Object.keys(formData.value.webhookOptions.headers).length > 0
        ) {
          payload.webhook.headers = formData.value.webhookOptions.headers;
        }
        if (
          formData.value.webhookOptions.metadata &&
          Object.keys(formData.value.webhookOptions.metadata).length > 0
        ) {
          payload.webhook.metadata = formData.value.webhookOptions.metadata;
        }
        if (
          formData.value.webhookOptions.events &&
          formData.value.webhookOptions.events.length > 0
        ) {
          payload.webhook.events = formData.value.webhookOptions.events;
        }
      }

      try {
        loading.value = true;
        crawling.value = true;
        progress.value = 0;
        pagesCompleted.value = 0;
        totalPages.value = 0;
        error.value = '';
        result.value = null;

        // Call the crawling API to submit the crawl job
        const response = await api.crawling.crawlUrls(payload);
        result.value = response.data;

        // Add the submitted job to history
        if (response.data && response.data.id) {
          crawlHistory.value.unshift({
            // Add to the beginning of the array
            id: response.data.id,
            url: formData.value.url,
            createdAt: new Date().toISOString(), // Use current time for creation date
            status: 'started', // Initial status
            crawlerOptions: { ...formData.value.crawlerOptions }, // Store a copy of options
            scrapeOptions: { ...formData.value.scrapeOptions },
            webhookOptions: { ...formData.value.webhookOptions },
          });
          saveHistory(); // Save history after adding a new job
          fetchCrawlStatus(response.data.id);
          loading.value = false; // hide loading spinner once polling starts
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('401')) {
            router.push({ name: 'ApiConfig' });
            return;
          }
          error.value = err.message.includes('404')
            ? 'Resource not found (404)'
            : err.message.includes('Network Error')
              ? 'Network connection failed'
              : err.message;
        } else {
          error.value = 'An unexpected error occurred';
        }
        loading.value = false; // Stop loading on error
        crawling.value = false; // Stop crawling animation on error
      }
    };

    // Interval ID for polling crawl status
    let intervalId: ReturnType<typeof setInterval> | null = null;

    /**
     * Fetch crawl status and progress periodically from the API.
     * Clears any existing interval before starting a new one.
     * Updates reactive variables with the latest status, completed pages, and total pages.
     * Stops polling when the crawl job is completed or failed.
     * @param {string} jobId - The ID of the crawl job.
     */
    const fetchCrawlStatus = async (jobId: string) => {
      // Clear any existing interval before starting a new one
      if (intervalId) {
        clearInterval(intervalId);
      }

      intervalId = setInterval(async () => {
        try {
          // Call the actual API endpoint to get the crawl status
          const response = await api.crawling.getCrawlStatus(jobId);
          const data = response.data;

          // Update reactive variables with real data
          crawlStatus.value = data.status;
          pagesCompleted.value = data.completed || 0;
          totalPages.value = data.total || 0;
          // Calculate progress based on completed vs total pages
          if (
            data.total !== undefined &&
            data.total > 0 &&
            data.completed !== undefined &&
            data.completed >= 0
          ) {
            progress.value = Math.round((data.completed / data.total) * 100);
          } else {
            progress.value = 0; // Or handle as appropriate if total is 0 or completed is undefined/negative
          }

          console.log(
            `Crawl status for ${jobId}: ${data.status}, Completed: ${data.completed}/${data.total}`,
          );

          // Stop polling when completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(intervalId);
            intervalId = null; // Clear intervalId after clearing interval
            crawling.value = false; // Update crawling state
            saveHistory(); // Save history when status changes to completed or failed
          }
        } catch (err: any) {
          console.error('Failed to fetch crawl status:', err);
          // Stop polling on error
          clearInterval(intervalId);
          intervalId = null;
          crawling.value = false;
          crawlStatus.value = 'failed'; // Indicate failure in UI
          error.value = `Failed to fetch crawl status: ${err.message || 'Unknown error'}`;
        }
      }, 1000); // Poll every 1 second
    };

    onMounted(() => {
      // Load history from LocalStorage on component mount
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        try {
          crawlHistory.value = JSON.parse(savedHistory);
        } catch (e) {
          console.error('Failed to parse crawl history from LocalStorage:', e);
          // Optionally clear invalid data
          // localStorage.removeItem(HISTORY_STORAGE_KEY);
        }
      }
    });

    // Cleanup polling interval when the component unmounts
    onUnmounted(() => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    });

    return {
      formData,
      includesInput,
      excludesInput,
      includeTagsInput,
      excludeTagsInput,
      webhookHeadersInput,
      webhookMetadataInput,
      locationLanguagesInput,
      jsonOptionsSchemaInput,
      changeTrackingSchemaInput,
      changeTrackingModesInput,
      parseIncludes,
      parseExcludes,
      parseIncludeTags,
      parseExcludeTags,
      parseLocationLanguages,
      parseJsonOptionsSchema,
      parseChangeTrackingSchema,
      parseChangeTrackingModes,
      parseWebhookHeaders,
      parseWebhookMetadata,
      loading,
      crawling,
      progress,
      pagesCompleted,
      totalPages,
      crawlStatus,
      error,
      result,
      handleSubmit,
      isCrawlerOptionsCollapsed,
      isScrapeOptionsCollapsed,
      isWebhookOptionsCollapsed,
      handleDownload,
      handleDownloadCompiledMarkdown,
      crawlHistory,
      selectedCrawlId,
      selectedCrawl,
      selectCrawl,
      simulatedFiles,
      activeFormats,
      selectedFormats,
      crawlerOptionsArrow,
      scrapeOptionsArrow,
      webhookOptionsArrow,
      useSubfolders,
      clearHistory,
      // Expose saveHistory if needed elsewhere, though not strictly necessary for this task
      // saveHistory,
    };
  },
});
</script>

<style scoped>
.crawl-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
.form-group {
  margin-bottom: 20px;
}
.options-fieldset {
  border: 1px solid #ccc;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}
.options-fieldset legend {
  font-weight: bold;
  padding: 0 5px;
}
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
}
.form-group small {
  display: block;
  font-size: 0.8em;
  color: #666;
  margin-top: 3px;
}
.status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
}
.loading {
  background: #f0f7ff;
  color: #0066cc;
}

/* Progress bar container */
.progress-container {
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 5px;
  margin-top: 10px;
  overflow: hidden; /* Ensure the inner bar stays within bounds */
}

/* Inner progress bar */
.progress-bar {
  height: 20px;
  background-color: #4caf50; /* Green color */
  text-align: center;
  line-height: 20px; /* Center text vertically */
  color: white;
  transition: width 0.5s ease; /* Smooth transition for progress updates */
}

.error {
  background: #fff0f0;
  color: #cc0000;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0, 102, 204, 0.3);
  border-radius: 50%;
  border-top-color: #0066cc;
  animation: spin 1s ease-in-out infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.download-section {
  margin-top: 20px;
}

.download-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.crawl-history-section li {
  cursor: pointer;
  margin-bottom: 8px;
}

.history-list {
  list-style: none;
  padding: 0;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-button {
  margin-left: 10px;
  padding: 5px 10px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.history-button:hover {
  background-color: #0056b3;
}

.download-button {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  margin-top: 0;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.download-button:hover {
  background-color: #0056b3;
}

.clear-history-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.selected-crawl {
  background-color: #1f2d3d;
}

.collapsible-header {
  cursor: pointer;
  user-select: none;
}

.error-icon {
  width: 20px;
  height: 20px;
}
</style>
