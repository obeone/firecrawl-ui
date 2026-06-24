<template>
  <PlaygroundLayout
    title="Crawl"
    subtitle="Crawl an entire site and collect every page"
    :tabs="responseTabs"
    :running="loading"
    :error="error || null"
    :has-result="hasResult"
    :status="statusLabel"
    :status-type="statusType"
    :duration="durationMs"
    empty-hint="Configure a base URL and start a crawl to follow its progress here."
  >
    <!-- REQUEST: crawl configuration form + submit button -->
    <template #request>
      <form class="crawl-config-form" @submit.prevent="handleSubmit">
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
                />
                <div v-if="includesError" class="error-message">{{ includesError }}</div>
                <small>Comma-separated regex patterns. Only matching URLs will be included.</small>
              </div>
              <div class="form-group">
                <label for="excludes">Excludes (Regex Patterns):</label>
                <input
                  id="excludes"
                  v-model="excludesInput"
                  type="text"
                  placeholder="/login, /private/.*"
                />
                <div v-if="excludesError" class="error-message">{{ excludesError }}</div>
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
              <div class="form-group">
                <label for="maxConcurrency">Max Concurrency:</label>
                <input
                  id="maxConcurrency"
                  v-model.number="formData.crawlerOptions.maxConcurrency"
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                />
                <small>Maximum number of pages processed in parallel.</small>
              </div>
              <div class="form-group">
                <label for="statusInterval">Status Check Interval (seconds):</label>
                <input
                  id="statusInterval"
                  v-model.number="statusCheckInterval"
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                />
                <small>Time between status checks.</small>
              </div>
            </div>
            <div class="grid-layout">
              <div class="form-group">
                <label for="sitemapMode">Sitemap Mode:</label>
                <select id="sitemapMode" v-model="formData.crawlerOptions.sitemap">
                  <option value="include">Include sitemap</option>
                  <option value="skip">Skip sitemap</option>
                  <option value="only">Only sitemap URLs</option>
                </select>
              </div>
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.crawlerOptions.ignoreQueryParameters" />
                Ignore Query Parameters
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.crawlerOptions.allowExternalLinks" />
                Allow External Links
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.crawlerOptions.allowSubdomains" />
                Allow Subdomains
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
                <option value="images">Images</option>
                <option value="summary">Summary</option>
                <option value="screenshot">Screenshot (Viewport)</option>
                <option value="screenshot@fullPage">Screenshot (Full Page)</option>
                <option value="json">JSON</option>
                <option value="attributes">Attributes</option>
                <option value="branding">Branding</option>
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
                <option value="auto">Auto</option>
                <option value="basic">Basic</option>
                <option value="stealth">Stealth</option>
                <option value="enhanced">Enhanced</option>
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
              <textarea id="jsonSchema" v-model="jsonOptionsSchemaInput"></textarea>
              <div v-if="jsonOptionsSchemaError" class="error-message">
                {{ jsonOptionsSchemaError }}
              </div>
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
              <textarea id="changeSchema" v-model="changeTrackingSchemaInput"></textarea>
              <div v-if="changeTrackingSchemaError" class="error-message">
                {{ changeTrackingSchemaError }}
              </div>
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
                ></textarea>
                <div v-if="webhookHeadersError" class="error-message">
                  {{ webhookHeadersError }}
                </div>
              </div>
              <div class="form-group">
                <label for="webhookMetadata">Webhook Metadata (JSON):</label>
                <textarea
                  id="webhookMetadata"
                  v-model="webhookMetadataInput"
                  placeholder='{"source": "ui"}'
                ></textarea>
                <div v-if="webhookMetadataError" class="error-message">
                  {{ webhookMetadataError }}
                </div>
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
    </template>

    <!-- RESPONSE: status / pages / json tabs -->
    <template #response="{ activeTab }">
      <!-- STATUS TAB: live job progress + download options -->
      <div v-if="activeTab === 'status'" class="tab-pane">
        <!-- Active crawl status with progress bar -->
        <div v-if="crawling" class="crawl-status-section">
          <h2>Crawl Status</h2>
          <p>Status: {{ crawlStatus }}</p>
          <div class="progress-container">
            <div class="progress-bar" :style="{ width: progress + '%' }"></div>
          </div>
          <p>{{ progress }}% Completed</p>
          <p>{{ pagesCompleted }} / {{ totalPages }} pages processed</p>
          <button class="primary-button" type="button" @click="cancelCurrentCrawl">
            Cancel Crawl
          </button>
        </div>

        <!-- Completed crawl summary (when not actively crawling) -->
        <div v-else-if="result" class="crawl-status-section">
          <h2>Crawl Status</h2>
          <p>Status: {{ crawlStatus || 'submitted' }}</p>
          <div class="progress-container">
            <div class="progress-bar" :style="{ width: progress + '%' }"></div>
          </div>
          <p>{{ progress }}% Completed</p>
          <p>{{ pagesCompleted }} / {{ totalPages }} pages processed</p>
        </div>

        <!-- Download options after crawl completion -->
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
      </div>

      <!-- PAGES TAB: selected crawl files + crawl history -->
      <div v-else-if="activeTab === 'pages'" class="tab-pane">
        <!-- Selected crawl details -->
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
              <button
                class="download-button"
                @click="handleDownload('Full JSON', selectedCrawl.id)"
              >
                Download Full JSON
              </button>
            </div>
          </div>

          <button class="primary-button" @click="selectedCrawlId = null">Hide Details</button>
        </div>

        <!-- Crawl history -->
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
            <button class="primary-button" type="button" @click="clearHistory">
              Clear History
            </button>
          </div>
        </div>
      </div>

      <!-- JSON TAB: raw crawl job response -->
      <CodeBlock v-else-if="activeTab === 'json'" :json="result" label="JSON" />
    </template>
  </PlaygroundLayout>
</template>

<script lang="ts">
import { defineComponent, ref, inject, onMounted, onUnmounted, computed, watch } from 'vue';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { useRouter } from 'vue-router';
import PlaygroundLayout from '../components/playground/PlaygroundLayout.vue';
import CodeBlock from '../components/playground/CodeBlock.vue';
import {
  type FirecrawlCrawlingApi,
  type FirecrawlExtractionApi,
  type FirecrawlMappingApi,
  type FirecrawlScrapingApi,
} from '../services/firecrawl';

/**
 * Interface for Crawler Options section of the form.
 */
interface CrawlerOptions {
  includes?: string[];
  excludes?: string[];
  maxDepth?: number;
  maxDiscoveryDepth?: number;
  sitemap?: 'include' | 'skip' | 'only';
  ignoreSitemap?: boolean;
  ignoreQueryParameters?: boolean;
  limit?: number;
  delay?: number;
  maxConcurrency?: number;
  allowExternalLinks?: boolean;
  allowSubdomains?: boolean;
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
  components: { PlaygroundLayout, CodeBlock },
  setup() {
    const router = useRouter();
    // Define the type of the injected api object based on the structure provided in src/plugins/api.ts
    const api = inject('api') as {
      crawling: FirecrawlCrawlingApi;
      extraction: FirecrawlExtractionApi;
      mapping: FirecrawlMappingApi;
      scraping: FirecrawlScrapingApi;
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
        sitemap: 'include',
        ignoreSitemap: false,
        ignoreQueryParameters: false,
        limit: undefined,
        delay: undefined,
        maxConcurrency: undefined,
        allowExternalLinks: false,
        allowSubdomains: false,
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

    const includesError = ref('');
    const excludesError = ref('');
    const webhookHeadersError = ref('');
    const webhookMetadataError = ref('');
    const jsonOptionsSchemaError = ref('');
    const changeTrackingSchemaError = ref('');

    // State for collapsible sections
    const isCrawlerOptionsCollapsed = ref(true);
    const isScrapeOptionsCollapsed = ref(true);
    const isWebhookOptionsCollapsed = ref(true);
    const useSubfolders = ref(false);
    const statusCheckInterval = ref(3);

    const crawlerOptionsArrow = computed(() => (isCrawlerOptionsCollapsed.value ? '▶' : '▼'));
    const scrapeOptionsArrow = computed(() => (isScrapeOptionsCollapsed.value ? '▶' : '▼'));
    const webhookOptionsArrow = computed(() => (isWebhookOptionsCollapsed.value ? '▶' : '▼'));

    /**
     * Parses and validates regex patterns from the includes input.
     * Updates formData.crawlerOptions.includes when all patterns are valid.
     */
    const parseIncludes = (): void => {
      const patterns = includesInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const pattern of patterns) {
        try {
          new RegExp(pattern);
        } catch (e: any) {
          includesError.value = `Invalid regex pattern: ${pattern}`;
          return;
        }
      }
      includesError.value = '';
      formData.value.crawlerOptions.includes = patterns;
    };

    /**
     * Parses and validates regex patterns from the excludes input.
     * Updates formData.crawlerOptions.excludes when all patterns are valid.
     */
    const parseExcludes = (): void => {
      const patterns = excludesInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const pattern of patterns) {
        try {
          new RegExp(pattern);
        } catch (e: any) {
          excludesError.value = `Invalid regex pattern: ${pattern}`;
          return;
        }
      }
      excludesError.value = '';
      formData.value.crawlerOptions.excludes = patterns;
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
    const parseWebhookHeaders = (): void => {
      try {
        formData.value.webhookOptions.headers = webhookHeadersInput.value
          ? JSON.parse(webhookHeadersInput.value)
          : {};
        webhookHeadersError.value = '';
      } catch (e: any) {
        webhookHeadersError.value = `Invalid JSON: ${e.message}`;
      }
    };

    /**
     * Parses the webhookMetadataInput string as JSON and updates
     * formData.webhookOptions.metadata. Sets an error message if parsing fails.
     */
    const parseWebhookMetadata = (): void => {
      try {
        formData.value.webhookOptions.metadata = webhookMetadataInput.value
          ? JSON.parse(webhookMetadataInput.value)
          : {};
        webhookMetadataError.value = '';
      } catch (e: any) {
        webhookMetadataError.value = `Invalid JSON: ${e.message}`;
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
    const parseJsonOptionsSchema = (): void => {
      try {
        formData.value.scrapeOptions.jsonOptions = formData.value.scrapeOptions.jsonOptions || {};
        formData.value.scrapeOptions.jsonOptions.schema = jsonOptionsSchemaInput.value
          ? JSON.parse(jsonOptionsSchemaInput.value)
          : undefined;
        jsonOptionsSchemaError.value = '';
      } catch (e: any) {
        jsonOptionsSchemaError.value = `Invalid JSON: ${e.message}`;
      }
    };

    /**
     * Parses the changeTrackingSchemaInput string as JSON and updates
     * formData.scrapeOptions.changeTrackingOptions.schema. Sets an error message if parsing fails.
     */
    const parseChangeTrackingSchema = (): void => {
      try {
        formData.value.scrapeOptions.changeTrackingOptions =
          formData.value.scrapeOptions.changeTrackingOptions || {};
        formData.value.scrapeOptions.changeTrackingOptions.schema = changeTrackingSchemaInput.value
          ? JSON.parse(changeTrackingSchemaInput.value)
          : undefined;
        changeTrackingSchemaError.value = '';
      } catch (e: any) {
        changeTrackingSchemaError.value = `Invalid JSON: ${e.message}`;
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

    // Watchers to validate inputs in real time
    watch(includesInput, parseIncludes, { immediate: true });
    watch(excludesInput, parseExcludes, { immediate: true });
    watch(webhookHeadersInput, parseWebhookHeaders, { immediate: true });
    watch(webhookMetadataInput, parseWebhookMetadata, { immediate: true });
    watch(jsonOptionsSchemaInput, parseJsonOptionsSchema, { immediate: true });
    watch(changeTrackingSchemaInput, parseChangeTrackingSchema, { immediate: true });

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
    const currentCrawlId = ref<string | null>(null);
    const crawlHistory = ref<any[]>([]); // Initialize with empty array

    // Duration (ms) of the crawl-submission request, surfaced in the playground status bar.
    const durationMs = ref<number | null>(null);

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
     * Response tabs presented by the playground layout.
     * @returns {{ key: string; label: string }[]} Tab descriptors.
     */
    const responseTabs = computed(() => [
      { key: 'status', label: 'Status' },
      { key: 'pages', label: 'Pages' },
      { key: 'json', label: 'JSON' },
    ]);

    /**
     * Whether the response pane has something to show: an active or finished
     * crawl job, or existing crawl history.
     * @returns {boolean} True when results/history are available.
     */
    const hasResult = computed((): boolean => {
      return crawling.value || !!result.value || crawlHistory.value.length > 0;
    });

    /**
     * Human-readable status label for the playground status bar.
     * @returns {string | null} The current job status, or null when idle.
     */
    const statusLabel = computed((): string | null => {
      if (crawling.value) {
        return crawlStatus.value ? `${crawlStatus.value} (${progress.value}%)` : 'Running';
      }
      if (crawlStatus.value) {
        return crawlStatus.value;
      }
      if (result.value) {
        return 'Submitted';
      }
      return null;
    });

    /**
     * Status semantic for the playground status dot.
     * @returns {'success' | 'error' | 'info' | 'idle'} The status type.
     */
    const statusType = computed((): 'success' | 'error' | 'info' | 'idle' => {
      if (crawling.value) {
        return 'info';
      }
      if (crawlStatus.value === 'completed') {
        return 'success';
      }
      if (crawlStatus.value === 'failed' || crawlStatus.value === 'cancelled') {
        return 'error';
      }
      return 'idle';
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
      for (const id in historyIntervalIds) {
        clearInterval(historyIntervalIds[id]);
        delete historyIntervalIds[id];
      }
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

      if (
        includesError.value ||
        excludesError.value ||
        webhookHeadersError.value ||
        webhookMetadataError.value ||
        jsonOptionsSchemaError.value ||
        changeTrackingSchemaError.value
      ) {
        error.value = 'Please fix the errors above before submitting';
        return;
      }

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
      if (crawler.sitemap) payload.sitemap = crawler.sitemap;
      if (crawler.ignoreSitemap) payload.ignoreSitemap = true;
      if (crawler.ignoreQueryParameters) payload.ignoreQueryParameters = true;
      if (crawler.limit !== undefined) payload.limit = crawler.limit;
      if (crawler.delay !== undefined) payload.delay = crawler.delay;
      if (crawler.maxConcurrency !== undefined) payload.maxConcurrency = crawler.maxConcurrency;
      if (crawler.navigateBacklinks) payload.allowBackwardLinks = true;
      if (crawler.allowExternalLinks) payload.allowExternalLinks = true;
      if (crawler.allowSubdomains) payload.allowSubdomains = true;

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
        currentCrawlId.value = null;
        durationMs.value = null;

        // Call the crawling API to submit the crawl job
        const startedAt = performance.now();
        const response = await api.crawling.crawlUrls(payload);
        durationMs.value = performance.now() - startedAt;
        result.value = response.data;

        // Add the submitted job to history
        if (response.data && response.data.id) {
          currentCrawlId.value = response.data.id;
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
        currentCrawlId.value = null;
      }
    };

    /**
     * Cancel the currently running crawl job.
     * Stops status polling and updates the UI state accordingly.
     */
    const cancelCurrentCrawl = async (): Promise<void> => {
      if (!currentCrawlId.value) {
        return;
      }
      try {
        await api.crawling.cancelCrawl(currentCrawlId.value);
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        crawlStatus.value = 'cancelled';
        crawling.value = false;
        const historyItem = crawlHistory.value.find((c) => c.id === currentCrawlId.value);
        if (historyItem) {
          historyItem.status = 'cancelled';
          saveHistory();
        }
        currentCrawlId.value = null;
      } catch (err: any) {
        error.value = `Failed to cancel crawl: ${err.message || 'Unknown error'}`;
      }
    };

    // Interval ID for polling crawl status
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const historyIntervalIds: Record<string, ReturnType<typeof setInterval>> = {};

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

          const historyItem = crawlHistory.value.find((c) => c.id === jobId);
          if (historyItem) {
            historyItem.status = data.status;
            saveHistory();
          }

          // Stop polling when completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(intervalId);
            intervalId = null; // Clear intervalId after clearing interval
            crawling.value = false; // Update crawling state
            currentCrawlId.value = null;
            saveHistory(); // Save history when status changes to completed or failed
          }
        } catch (err: any) {
          console.error('Failed to fetch crawl status:', err);
          // Stop polling on error
          clearInterval(intervalId);
          intervalId = null;
          crawling.value = false;
          crawlStatus.value = 'failed'; // Indicate failure in UI
          currentCrawlId.value = null;
          error.value = `Failed to fetch crawl status: ${err.message || 'Unknown error'}`;
          const historyItem = crawlHistory.value.find((c) => c.id === jobId);
          if (historyItem) {
            historyItem.status = 'failed';
            saveHistory();
          }
        }
      }, statusCheckInterval.value * 1000);
    };

    /**
     * Check the status of a crawl from history and update its record.
     * Starts polling if the crawl is still running.
     * @param crawl - History entry to check.
     */
    const checkHistoryStatus = async (crawl: any) => {
      try {
        const response = await api.crawling.getCrawlStatus(crawl.id);
        crawl.status = response.data.status;
        saveHistory();
        if (crawl.status !== 'completed' && crawl.status !== 'failed') {
          startHistoryPolling(crawl.id);
        }
      } catch (err) {
        console.error(`Failed to fetch status for crawl ${crawl.id}:`, err);
        crawl.status = 'unavailable';
        saveHistory();
      }
    };

    /**
     * Start polling status for a specific history entry.
     * @param id - Crawl job identifier.
     */
    const startHistoryPolling = (id: string) => {
      stopHistoryPolling(id);
      historyIntervalIds[id] = setInterval(async () => {
        const crawl = crawlHistory.value.find((c) => c.id === id);
        if (!crawl) {
          stopHistoryPolling(id);
          return;
        }
        try {
          const response = await api.crawling.getCrawlStatus(id);
          crawl.status = response.data.status;
          saveHistory();
          if (crawl.status === 'completed' || crawl.status === 'failed') {
            stopHistoryPolling(id);
          }
        } catch (err) {
          console.error(`Polling failed for crawl ${id}:`, err);
          crawl.status = 'unavailable';
          saveHistory();
          stopHistoryPolling(id);
        }
      }, statusCheckInterval.value * 1000);
    };

    /**
     * Stop polling status for a specific history entry.
     * @param id - Crawl job identifier.
     */
    const stopHistoryPolling = (id: string) => {
      const intId = historyIntervalIds[id];
      if (intId) {
        clearInterval(intId);
        delete historyIntervalIds[id];
      }
    };

    onMounted(async () => {
      // Load history from LocalStorage on component mount
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        try {
          crawlHistory.value = JSON.parse(savedHistory);
        } catch (e) {
          console.error('Failed to parse crawl history from LocalStorage:', e);
        }
      }
      await Promise.all(crawlHistory.value.map((c) => checkHistoryStatus(c)));
    });

    // Cleanup polling interval when the component unmounts
    onUnmounted(() => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      for (const id in historyIntervalIds) {
        clearInterval(historyIntervalIds[id]);
        delete historyIntervalIds[id];
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
      includesError,
      excludesError,
      webhookHeadersError,
      webhookMetadataError,
      jsonOptionsSchemaError,
      changeTrackingSchemaError,
      parseIncludeTags,
      parseExcludeTags,
      parseLocationLanguages,
      parseChangeTrackingModes,
      loading,
      crawling,
      progress,
      pagesCompleted,
      totalPages,
      crawlStatus,
      error,
      result,
      durationMs,
      responseTabs,
      hasResult,
      statusLabel,
      statusType,
      handleSubmit,
      cancelCurrentCrawl,
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
      statusCheckInterval,
      clearHistory,
      // Expose saveHistory if needed elsewhere, though not strictly necessary for this task
      // saveHistory,
    };
  },
});
</script>

<style scoped>
/* ---------------------------------------------------------------------------
 * Request form — fields stack naturally within the request pane.
 * --------------------------------------------------------------------------- */
.crawl-config-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  margin-bottom: 0;
}

.form-group > label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 600;
  font-size: 0.9rem;
}

/* All text-like inputs inside the crawl form span the full width. */
.crawl-config-form input,
.crawl-config-form select,
.crawl-config-form textarea {
  width: 100%;
}

/* ---------------------------------------------------------------------------
 * Collapsible option fieldsets — frosted glass cards that nest inside the
 * request pane. Hover-lift makes the collapsed/expanded state feel tactile.
 * --------------------------------------------------------------------------- */
.options-fieldset {
  /* Glass surface: translucent fill + heavy blur so the aurora shows through. */
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  padding: 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 0;
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    transform var(--transition);
}

.options-fieldset:hover {
  /* Gentle lift on hover to indicate the fieldset is interactive. */
  border-color: var(--color-border-hover);
  box-shadow: var(--box-shadow-card);
  transform: translateY(-2px);
}

.options-fieldset legend {
  font-weight: 700;
  padding: 0 0.4rem;
  color: var(--color-heading);
}

/* ---------------------------------------------------------------------------
 * Collapsible legend — pointer cursor + violet hover to signal click-to-toggle.
 * --------------------------------------------------------------------------- */
.collapsible-header {
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
}

.collapsible-header:hover {
  color: var(--brand-strong);
}

/* Responsive grid for compact option pairs (e.g. max depth / limit). */
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

/* Checkbox rows: the checkbox and its label share one flex row. */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* Prevent the checkbox from stretching to 100% width. */
.checkbox-label input {
  width: auto;
}

/* Helper text under form fields. */
.form-group small {
  display: block;
  font-size: 0.8em;
  color: var(--color-text-mute);
  margin-top: 0.2rem;
}

/* Inline validation error text — danger hue from the token set. */
.error-message {
  color: var(--hue-danger);
  font-size: 0.9em;
  margin-top: 0.3rem;
}

/* ---------------------------------------------------------------------------
 * Response panes — content areas for the Status, Pages, and JSON tabs.
 * --------------------------------------------------------------------------- */

/* Common tab pane: constrained padding, headings scaled down from panel h2. */
.tab-pane {
  padding: 1.25rem;
}

.tab-pane h2 {
  font-size: 1.1rem;
  margin-bottom: 0.6rem;
}

.tab-pane h3 {
  font-size: 0.95rem;
  margin: 1rem 0 0.5rem;
}

.crawl-status-section p {
  margin-bottom: 0.25rem;
}

/* ---------------------------------------------------------------------------
 * Progress bar — glass track with aurora gradient fill.
 * --------------------------------------------------------------------------- */

/* Track: glass surface so the aurora tints the empty portion of the bar. */
.progress-container {
  width: 100%;
  /* Glass fill rather than opaque background so the aurora shows through. */
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  margin: 0.5rem 0;
  overflow: hidden;
}

/* Fill: violet→cyan aurora sweep to match the brand gradient. */
.progress-bar {
  height: 14px;
  background: var(--gradient-violet);
  transition: width 0.5s var(--ease);
}

/* ---------------------------------------------------------------------------
 * Download section — appears after a completed crawl.
 * --------------------------------------------------------------------------- */
.download-section {
  margin-top: 1.25rem;
}

.download-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

/* ---------------------------------------------------------------------------
 * Selected crawl details — shown above history when a job is expanded.
 * --------------------------------------------------------------------------- */
.selected-crawl-details-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.selected-crawl-details-section ul {
  margin: 0 0 0.5rem 1.2rem;
  font-size: 0.88rem;
  color: var(--color-text-soft);
}

/* ---------------------------------------------------------------------------
 * Crawl history list — each item is a frosted glass row with hover-lift and
 * a violet halo so it reads like the interactive cards in HomeView.
 * --------------------------------------------------------------------------- */
.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  /* Frosted glass row: subtle fill + hairline border. */
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    transform var(--transition);
}

.history-item:hover {
  /* Lift + soft violet halo matches the HomeView tool-card hover style. */
  border-color: var(--color-border-hover);
  box-shadow:
    var(--box-shadow-card),
    0 0 0 1px rgba(124, 92, 255, 0.2),
    0 6px 24px -8px rgba(124, 92, 255, 0.4);
  transform: translateY(-2px);
}

/* Highlight the currently selected history row with a brand-tinted background. */
.selected-crawl {
  background: var(--brand-soft);
  border-color: rgba(124, 92, 255, 0.35);
}

.history-info {
  font-size: 0.88rem;
  color: var(--color-text-soft);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------------------------------------------------------------------------
 * History and download action buttons — violet→cyan aurora sweep, consistent
 * with the primary-button style defined in main.css.
 * --------------------------------------------------------------------------- */
.history-button {
  flex-shrink: 0;
  padding: 0.35rem 0.7rem;
  /* Aurora gradient (violet→cyan) instead of the old fire/orange. */
  background: var(--gradient-violet);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.history-button:hover {
  background: var(--gradient-violet-hover);
  box-shadow: 0 6px 20px -6px rgba(124, 92, 255, 0.6);
  transform: translateY(-1px);
}

.download-button {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  font-weight: 600;
  /* Aurora gradient (violet→cyan) instead of the old fire/orange. */
  background: var(--gradient-violet);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.download-button:hover {
  background: var(--gradient-violet-hover);
  box-shadow: 0 6px 20px -6px rgba(124, 92, 255, 0.6);
  transform: translateY(-1px);
}

/* Clear-history button stays right-aligned. */
.clear-history-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.6rem;
}
</style>
