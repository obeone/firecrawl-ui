<template>
  <div class="scrape-config-container">
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
          Crawler Options
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
              <small
                >Comma-separated regex patterns. Only matching URLs will be
                included.</small
              >
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
              <small
                >Maximum depth relative to the base URL (path segments).</small
              >
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
              <label for="delay">Delay between pages (s):</label>
              <input
                id="delay"
                v-model.number="formData.crawlerOptions.delay"
                type="number"
                min="0"
                placeholder="0"
              />
              <small>Delay in seconds between scrapes.</small>
            </div>
          </div>
          <div class="grid-layout">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.crawlerOptions.ignoreSitemap"
              />
              Ignore Sitemap
            </label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.crawlerOptions.ignoreQueryParameters"
              />
              Ignore Query Parameters
            </label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.crawlerOptions.allowExternalLinks"
              />
              Allow External Links
            </label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.crawlerOptions.allowBackwardLinks"
              />
              Allow Backward Links
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
          Scrape Options
        </legend>
        <div v-show="!isScrapeOptionsCollapsed">
          <div class="form-group">
            <label for="formats">Output Formats:</label>
            <select
              id="formats"
              v-model="formData.scrapeOptions.formats"
              multiple
            >
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="rawHtml">Raw HTML</option>
              <option value="links">Links</option>
              <option value="screenshot">Screenshot (Viewport)</option>
              <option value="screenshot@fullPage">
                Screenshot (Full Page)
              </option>
              <option value="json">JSON</option>
              <option value="changeTracking">Change Tracking</option>
            </select>
            <small>Select one or more formats.</small>
          </div>
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="formData.scrapeOptions.onlyMainContent"
            />
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
              >Comma-separated CSS selectors. Only content within these tags
              will be included.</small
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
            <small
              >Comma-separated CSS selectors to exclude content within these
              tags.</small
            >
          </div>
        </div>
      </fieldset>

      <!-- Webhook Options Section -->
      <fieldset class="form-group options-fieldset">
        <legend
          class="collapsible-header"
          @click="isWebhookOptionsCollapsed = !isWebhookOptionsCollapsed"
        >
          Webhook Options (Optional)
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
                v-model="webhookHeadersJson"
                rows="3"
                placeholder='{ "Authorization": "token" }'
              ></textarea>
            </div>
            <div class="form-group">
              <label for="webhookMetadata">Webhook Metadata (JSON):</label>
              <textarea
                id="webhookMetadata"
                v-model="webhookMetadataJson"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="webhookEvents">Webhook Events:</label>
              <select id="webhookEvents" multiple v-model="webhookEvents">
                <option value="started">Started</option>
                <option value="page">Page</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>
      </fieldset>

      <button type="submit">Submit Crawl</button>
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
        <button @click="error = ''">Try again</button>
      </div>
    </div>

    <div v-if="result" class="result">
      <div class="result-header">
        <h2>Crawl Job Submitted</h2>
      </div>
      <pre>{{ result }}</pre>
    </div>

    <!-- Section for active crawl status -->
    <div v-if="crawling" class="crawl-status-section">
      <h2>Crawl Status</h2>
      <p>Status: {{ crawlStatus }}</p>
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
      <p>{{ progress }}% Completed</p>
    </div>

    <!-- Section for download options after crawl completion -->
    <div
      v-if="progress === 100 && crawlStatus === 'completed'"
      class="download-section"
    >
      <h2>Download Results</h2>
      <div class="download-buttons">
        <button
          v-for="fmt in formData.scrapeOptions.formats"
          :key="fmt"
          @click="handleDownload(fmt)"
        >
          Download {{ fmt }}
        </button>
        <button @click="handleDownload('Archive')">Download Archive</button>
        <button @click="handleDownload('Full JSON')">Download Full JSON</button>
      </div>
    </div>

    <!-- Section for crawl history -->
    <div class="crawl-history-section">
      <h2>Crawl History</h2>
      <div v-if="crawlHistory.length > 0">
        <ul>
          <li
            v-for="crawl in crawlHistory"
            :key="crawl.id"
            @click="selectCrawl(crawl.id)"
            :class="{ 'selected-crawl': selectedCrawlId === crawl.id }"
          >
            <strong>ID:</strong> {{ crawl.id }} | <strong>Date:</strong>
            {{ new Date(crawl.createdAt).toLocaleString() }} |
            <strong>Status:</strong> {{ crawl.status }}
            <button @click.stop="selectCrawl(crawl.id)">
              View Details / Access Files
            </button>
          </li>
        </ul>
      </div>
      <div v-else>
        <p>No crawl history available.</p>
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

      <button @click="selectedCrawlId = null">Hide Details</button>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  inject,
  onMounted,
  onUnmounted,
  computed,
  watch,
} from "vue";
import JSZip from "jszip";
import { useRouter } from "vue-router";
// Import the crawling API client (adjust import path as needed)
import {
  type BillingApi,
  type CrawlingApi,
  type ExtractionApi,
  type MappingApi,
  type ScrapingApi,
} from "../api-client/api";

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
  delay?: number;
  limit?: number;
  allowExternalLinks?: boolean;
  allowBackwardLinks?: boolean;
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

export default defineComponent({
  name: "CrawlView",
  setup() {
    const router = useRouter();
    // Define the type of the injected api object based on the structure provided in src/plugins/api.ts
    const api = inject("api") as {
      billing: BillingApi;
      crawling: CrawlingApi;
      extraction: ExtractionApi;
      mapping: MappingApi;
      scraping: ScrapingApi;
    };

    // Reactive form data with default values
    // Initialisation du formulaire avec des valeurs par défaut explicites pour éviter les undefined
    // Correction : utiliser undefined pour respecter les types TypeScript
    const formData = ref<FormData>({
      url: "",
      crawlerOptions: {
        includes: [],
        excludes: [],
        maxDepth: undefined,
        maxDiscoveryDepth: undefined,
        ignoreSitemap: false,
        ignoreQueryParameters: false,
        delay: undefined,
        limit: undefined,
        allowExternalLinks: false,
        allowBackwardLinks: false,
      },
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
        includeTags: [],
        excludeTags: [],
        headers: {},
        waitFor: undefined,
        mobile: false,
        removeBase64Images: false,
        actions: [],
      },
      webhookOptions: {
        url: undefined,
        headers: {},
        metadata: {},
        events: [],
      },
    });

    // Inputs for includes/excludes as comma-separated strings for user convenience
    const includesInput = ref("");
    const excludesInput = ref("");
    const includeTagsInput = ref("");
    const excludeTagsInput = ref("");

    // Webhook JSON string refs
    const webhookHeadersJson = ref(
      JSON.stringify(formData.value.webhookOptions.headers || {}, null, 2),
    );
    const webhookMetadataJson = ref(
      JSON.stringify(formData.value.webhookOptions.metadata || {}, null, 2),
    );
    const webhookEvents = ref<string[]>([]);

    // State for collapsible sections
    const isCrawlerOptionsCollapsed = ref(true);
    const isScrapeOptionsCollapsed = ref(true);
    const isWebhookOptionsCollapsed = ref(true);

    /**
     * Parse the includes input string into an array for the API payload.
     */
    const parseIncludes = () => {
      formData.value.crawlerOptions.includes = includesInput.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    };

    /**
     * Parse the excludes input string into an array for the API payload.
     */
    const parseExcludes = () => {
      formData.value.crawlerOptions.excludes = excludesInput.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    };

    /**
     * Parse the includeTags input string into an array for the API payload.
     */
    const parseIncludeTags = () => {
      formData.value.scrapeOptions.includeTags = includeTagsInput.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    };

    /**
     * Parse the excludeTags input string into an array for the API payload.
     */
    const parseExcludeTags = () => {
      formData.value.scrapeOptions.excludeTags = excludeTagsInput.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    };

    watch(webhookHeadersJson, (val) => {
      try {
        formData.value.webhookOptions.headers = val ? JSON.parse(val) : {};
      } catch {
        // ignore parse errors
      }
    });

    watch(webhookMetadataJson, (val) => {
      try {
        formData.value.webhookOptions.metadata = val ? JSON.parse(val) : {};
      } catch {
        // ignore parse errors
      }
    });

    watch(webhookEvents, (val) => {
      formData.value.webhookOptions.events = val;
    });

    const loading = ref(false);
    const crawling = ref(false);
    const progress = ref(0);
    const crawlStatus = ref<string | undefined>("");
    const error = ref("");
    const result = ref<any>(null);
    const crawlHistory = ref<any[]>([]); // Initialize with empty array

    // State for selected crawl history item
    const selectedCrawlId = ref<string | null>(null);
    const simulatedFiles = ref<string[]>([]);

    // LocalStorage key for crawl history
    const HISTORY_STORAGE_KEY = "crawlHistory";

    // Computed property to get the selected crawl details
    const selectedCrawl = computed(() => {
      return crawlHistory.value.find(
        (crawl) => crawl.id === selectedCrawlId.value,
      );
    });

    /**
     * Save the current crawl history to LocalStorage.
     */
    const saveHistory = () => {
      localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(crawlHistory.value),
      );
    };

    /**
     * Select a crawl from history and fetch its files.
     * Replaces simulated file logic with a real API call.
     * @param id - The ID of the selected crawl.
     */
    /**
     * Sélectionne un crawl dans l'historique et synchronise les champs d'entrée du formulaire.
     * @param id - L'identifiant du crawl sélectionné.
     */
    const selectCrawl = async (id: string) => {
      selectedCrawlId.value = id;
      simulatedFiles.value = [];
      error.value = "";

      try {
        // Récupère les fichiers pour le crawl sélectionné via l'API
        const response = await api.crawling.getCrawlStatus(id);
        simulatedFiles.value =
          response.data.data
            ?.map((file) => file.markdown)
            .filter((content): content is string => content !== undefined) ||
          [];
        console.log(`Fetched files for crawl ID: ${id}`, response.data);

        // Synchronise les champs d'entrée texte avec les valeurs du crawl sélectionné si disponibles
        const crawl = crawlHistory.value.find((c) => c.id === id);
        if (crawl && crawl.crawlerOptions) {
          includesInput.value = (crawl.crawlerOptions.includes || []).join(
            ", ",
          );
          excludesInput.value = (crawl.crawlerOptions.excludes || []).join(
            ", ",
          );
        }
        if (crawl && crawl.scrapeOptions) {
          includeTagsInput.value = (crawl.scrapeOptions.includeTags || []).join(
            ", ",
          );
          excludeTagsInput.value = (crawl.scrapeOptions.excludeTags || []).join(
            ", ",
          );
        }
        if (crawl && crawl.webhook) {
          webhookHeadersJson.value = JSON.stringify(crawl.webhook.headers || {}, null, 2);
          webhookMetadataJson.value = JSON.stringify(crawl.webhook.metadata || {}, null, 2);
          webhookEvents.value = crawl.webhook.events || [];
        }
      } catch (err: any) {
        console.error(`Error fetching crawl files for ID ${id}:`, err);
        error.value = `Failed to fetch crawl files for ID ${id}. ${err.message || err}`;
      }
    };

    /**
     * Handle download of crawl results.
     * @param type - The type of download (e.g., 'Archive', 'Full JSON').
     */
    /**
     * Handle download of crawl results.
     * Calls the appropriate API endpoint based on the download type ('Archive' or 'Full JSON').
     * Creates a Blob from the response and triggers a file download.
     * @param type - The type of download ('Archive' or 'Full JSON').
     */
    const handleDownload = async (type: string) => {
      console.log(`Handling download of ${type} for the active crawl.`);
      error.value = "";

      if (!result.value || !result.value.id) {
        error.value = "No active crawl job found to download results.";
        console.error("Attempted to download without an active crawl job result.");
        return;
      }

      const jobId = result.value.id;

      try {
        if (type === "Archive") {
          const response = await api.crawling.downloadArchive(jobId);
          const blob = response.data;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `crawl-archive-${jobId}.zip`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          return;
        }

        const { data } = await api.crawling.getCrawlResult(jobId);

        if (type === "Full JSON") {
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `crawl-result-${jobId}.json`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          return;
        }

        const pages = data.data || [];
        let blob: Blob | null = null;

        if (type === "markdown") {
          const content = pages
            .map((p: any) => p.markdown)
            .filter(Boolean)
            .join("\n\n---\n\n");
          blob = new Blob([content], { type: "text/markdown" });
        } else if (type === "html") {
          const content = pages
            .map((p: any) => p.html)
            .filter(Boolean)
            .join("\n\n<!-- page -->\n\n");
          blob = new Blob([content], { type: "text/html" });
        } else if (type === "rawHtml") {
          const content = pages
            .map((p: any) => p.rawHtml)
            .filter(Boolean)
            .join("\n\n<!-- page -->\n\n");
          blob = new Blob([content], { type: "text/html" });
        } else if (type === "links") {
          const links = pages.flatMap((p: any) => p.links || []);
          blob = new Blob([links.join("\n")], { type: "text/plain" });
        } else if (type.startsWith("screenshot")) {
          const urls: string[] = pages
            .map((p: any) => p.screenshot)
            .filter(Boolean);
          if (urls.length === 0) {
            throw new Error("No screenshots available");
          }
          const zip = new JSZip();
          let index = 1;
          for (const url of urls) {
            const resp = await fetch(url);
            const b = await resp.blob();
            const ext = b.type.split("/").pop() || "png";
            zip.file(`screenshot-${index}.${ext}`, b);
            index++;
          }
          blob = await zip.generateAsync({ type: "blob" });
        } else if (type === "json" || type === "changeTracking") {
          const stripped = pages.map((p: any) => ({
            url: p.metadata?.sourceURL,
            [type]: (p as any)[type],
          }));
          blob = new Blob([JSON.stringify(stripped, null, 2)], {
            type: "application/json",
          });
        } else {
          console.warn(`Unknown download type: ${type}`);
          return;
        }

        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          const extension = type === "links" ? "txt" : type;
          link.href = url;
          link.setAttribute("download", `crawl-${jobId}-${extension}`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } catch (err: any) {
        console.error(`Error during ${type} download for job ID ${jobId}:`, err);
        error.value = `Failed to download ${type}. ${err.message || err}`;
      }
    };

    /**
     * Validate a URL string.
     * @param url - The URL to validate.
     * @returns True if valid, false otherwise.
     */
    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    /**
     * Handle form submission: validate, build payload, call API, handle result.
     */
    const handleSubmit = async () => {
      parseIncludes();
      parseExcludes();
      parseIncludeTags();
      parseExcludeTags();

      if (!isValidUrl(formData.value.url)) {
        error.value = "Please enter a valid URL (e.g. https://example.com)";
        return;
      }
      if (
        !formData.value.scrapeOptions.formats ||
        formData.value.scrapeOptions.formats.length === 0
      ) {
        error.value = "Please select at least one output format";
        return;
      }

      // Build the request payload according to the OpenAPI CrawlRequest schema
      // Construction du payload avec toutes les options du formulaire, y compris maxDiscoveryDepth
      const payload: any = {
        url: formData.value.url,
        excludePaths: formData.value.crawlerOptions.excludes,
        includePaths: formData.value.crawlerOptions.includes,
        maxDepth: formData.value.crawlerOptions.maxDepth,
        maxDiscoveryDepth: formData.value.crawlerOptions.maxDiscoveryDepth,
        ignoreSitemap: formData.value.crawlerOptions.ignoreSitemap,
        ignoreQueryParameters: formData.value.crawlerOptions.ignoreQueryParameters,
        delay: formData.value.crawlerOptions.delay,
        limit: formData.value.crawlerOptions.limit,
        allowBackwardLinks: formData.value.crawlerOptions.allowBackwardLinks,
        allowExternalLinks: formData.value.crawlerOptions.allowExternalLinks,
        scrapeOptions: {
          formats: formData.value.scrapeOptions.formats,
          onlyMainContent: formData.value.scrapeOptions.onlyMainContent,
          includeTags: formData.value.scrapeOptions.includeTags,
          excludeTags: formData.value.scrapeOptions.excludeTags,
          headers: formData.value.scrapeOptions.headers,
          waitFor: formData.value.scrapeOptions.waitFor,
          mobile: formData.value.scrapeOptions.mobile,
          removeBase64Images: formData.value.scrapeOptions.removeBase64Images,
          actions: formData.value.scrapeOptions.actions,
        },
      };

      // Only include webhookOptions if at least one field is filled
      // Inclure webhookOptions uniquement si au moins un champ est non vide et non une chaîne vide
      if (
        (formData.value.webhookOptions.url && formData.value.webhookOptions.url !== "") ||
        (formData.value.webhookOptions.headers && Object.keys(formData.value.webhookOptions.headers).length > 0) ||
        (formData.value.webhookOptions.metadata && Object.keys(formData.value.webhookOptions.metadata).length > 0) ||
        (formData.value.webhookOptions.events && formData.value.webhookOptions.events.length > 0)
      ) {
        payload.webhook = { ...formData.value.webhookOptions };
      }

      try {
        loading.value = true;
        crawling.value = true;
        progress.value = 0;
        error.value = "";
        result.value = null;

        // Call the crawling API to submit the crawl job
        // @ts-ignore
        const response = await api.crawling.crawlUrls(payload);
        result.value = response.data;

        // Add the submitted job to history
        if (response.data && response.data.id) {
          crawlHistory.value.unshift({
            // Add to the beginning of the array
            id: response.data.id,
            url: formData.value.url,
            createdAt: new Date().toISOString(), // Use current time for creation date
            status: "started", // Initial status
            crawlerOptions: { ...formData.value.crawlerOptions }, // Store a copy of options
            scrapeOptions: { ...formData.value.scrapeOptions },
            webhook: { ...formData.value.webhookOptions },
          });
          saveHistory(); // Save history after adding a new job
          fetchCrawlStatus(response.data.id);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes("401")) {
            router.push({ name: "ApiConfig" });
            return;
          }
          error.value = err.message.includes("404")
            ? "Resource not found (404)"
            : err.message.includes("Network Error")
              ? "Network connection failed"
              : err.message;
        } else {
          error.value = "An unexpected error occurred";
        }
        loading.value = false; // Stop loading on error
        crawling.value = false; // Stop crawling animation on error
      }
    };

    // ID d'intervalle pour le polling du statut du crawl
    let intervalId: any = null;

    /**
     * Fetch crawl status and progress periodically from the API.
     * @param jobId - The ID of the crawl job.
     */
    const fetchCrawlStatus = async (jobId: string) => {
      // Clear any existing interval before starting a new one
      if (intervalId) {
        clearInterval(intervalId);
      }

      intervalId = setInterval(async () => {
        try {
          // Call the actual API endpoint to get the crawl status
          // @ts-ignore
          const response = await api.crawling.getCrawlStatus(jobId);
          const data = response.data;

          // Update reactive variables with real data
          crawlStatus.value = data.status;
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
          if (data.status === "completed" || data.status === "failed") {
            clearInterval(intervalId);
            intervalId = null; // Clear intervalId after clearing interval
            crawling.value = false; // Update crawling state
            saveHistory(); // Save history when status changes to completed or failed
          }
        } catch (err: any) {
          console.error("Failed to fetch crawl status:", err);
          // Stop polling on error
          clearInterval(intervalId);
          intervalId = null;
          crawling.value = false;
          crawlStatus.value = "failed"; // Indicate failure in UI
          error.value = `Failed to fetch crawl status: ${err.message || "Unknown error"}`;
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
          console.error("Failed to parse crawl history from LocalStorage:", e);
          // Optionally clear invalid data
          // localStorage.removeItem(HISTORY_STORAGE_KEY);
        }
      }
    });

    // Cleanup interval on component unmount
    // Nettoyage de l'intervalle de polling lors du démontage du composant
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
      parseIncludes,
      parseExcludes,
      parseIncludeTags,
      parseExcludeTags,
      loading,
      crawling,
      progress,
      crawlStatus,
      error,
      result,
      handleSubmit,
      isCrawlerOptionsCollapsed,
      isScrapeOptionsCollapsed,
      isWebhookOptionsCollapsed,
      handleDownload,
      crawlHistory,
      selectedCrawlId,
      selectedCrawl,
      selectCrawl,
      simulatedFiles,
      webhookHeadersJson,
      webhookMetadataJson,
      webhookEvents,
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

.download-buttons button {
  margin-right: 10px;
}

.error-icon {
  width: 20px;
  height: 20px;
}
</style>
