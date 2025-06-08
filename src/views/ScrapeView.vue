<template>
  <div class="page-container">
    <h1>Scrape Configuration</h1>

    <form class="scrape-config-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="url">URL:</label>
        <input id="url" v-model="formData.url" type="text" required />
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="formData.scrapeOptions.onlyMainContent" />
          Only Main Content
        </label>
      </div>

      <div class="form-group">
        <label for="formats">Output Formats:</label>
        <select id="formats" v-model="formData.scrapeOptions.formats" multiple>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="rawHtml">Raw HTML</option>
          <option value="links">Links</option>
          <option value="screenshot">Screenshot (Viewport)</option>
          <option value="screenshot@fullPage">Screenshot (Full Page)</option>
          <option value="json">JSON (Requires Extractor Options)</option>
          <option value="changeTracking">Change Tracking (Requires Markdown)</option>
        </select>
        <small>Select one or more formats.</small>
      </div>

      <!-- Change Tracking Options (conditional) -->
      <div v-if="formData.scrapeOptions.formats.includes('changeTracking')" class="form-group">
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
                <option value="">Auto</option>
                <option value="basic">Basic</option>
                <option value="stealth">Stealth</option>
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
          </div>
          <div class="form-group">
            <label for="headers">HTTP Headers (JSON format):</label>
            <textarea
              id="headers"
              v-model="headersJson"
              rows="4"
              placeholder='{"Authorization": "Bearer token", "Accept": "application/json"}'
            ></textarea>
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
        </div>
      </fieldset>

      <div
        v-if="
          formData.scrapeOptions.formats.includes(ScrapeAndExtractFromUrlRequestFormatsEnum.Extract)
        "
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

      <button type="submit" class="primary-button">Scrape</button>
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

    <div v-if="result" class="result">
      <div class="result-header">
        <h2>Results</h2>
        <div class="download-options">
          <button v-for="fmt in downloadFormats" :key="fmt" @click="downloadResult(fmt)">
            Download {{ fmt }}
          </button>
        </div>
      </div>
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, inject, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  ScrapeAndExtractFromUrlRequestFormatsEnum,
  type ScrapeAndExtractFromUrlRequest,
  type ScrapeResponse,
  type ScrapingApi,
  type ScrapeAndExtractFromUrlRequestExtract,
} from '../api-client/api';

type ScrapeResult = ScrapeResponse;

// Define interfaces for the reactive formData structure (can differ from API request structure for UI organization)
interface FormDataPageOptions {
  waitFor?: number;
  mobile?: boolean;
  skipTlsVerification?: boolean;
  timeout?: number;
  blockAds?: boolean;
  removeBase64Images?: boolean;
  proxy?: string | 'basic' | 'stealth';
  headers?: Record<string, string>;
  action?: string;
  location?: string;
}

interface FormDataScrapeOptions {
  formats: string[]; // Accept string values like "json", "markdown", etc.
  onlyMainContent?: boolean;
  includeTags?: string;
  excludeTags?: string;
}

interface FormDataExtractorOptions extends Partial<ScrapeAndExtractFromUrlRequestExtract> {
  // Add specific fields if needed for UI binding, otherwise Partial is fine
}

interface FormData {
  url: string;
  pageOptions: FormDataPageOptions;
  scrapeOptions: FormDataScrapeOptions;
  extractorOptions?: FormDataExtractorOptions; // Added extractorOptions for JSON format
  changeTrackingOptions: FormDataChangeTrackingOptions;
}

interface FormDataChangeTrackingOptions {
  threshold: number; // percentage threshold for change detection
  frequency: number; // frequency in minutes to check for changes
}

/**
 * Component for scraping a single URL with advanced options.
 *
 * @returns Component options for the scraping view.
 */
export default defineComponent({
  name: 'ScrapeView',
  setup() {
    const router = useRouter();
    const api = inject('api') as { scraping: ScrapingApi };

    // Initialize formData with nested structure and default values
    const formData = ref<FormData>({
      url: '',
      pageOptions: {
        waitFor: undefined, // Use undefined for optional numbers initially
        mobile: false,
        skipTlsVerification: false,
        timeout: undefined, // Default is 30000ms in API, let API handle default if undefined
        blockAds: true, // Default from docs
        removeBase64Images: true, // Default from docs
        proxy: '', // Default to Auto/empty string
        headers: {},
        action: 'GET',
        location: '',
      },
      scrapeOptions: {
        onlyMainContent: true, // Default from docs
        formats: [ScrapeAndExtractFromUrlRequestFormatsEnum.Markdown], // Default format
        includeTags: '',
        excludeTags: '',
      },
      extractorOptions: {}, // Added extractorOptions initial empty object
      changeTrackingOptions: {
        threshold: 10, // default threshold percentage
        frequency: 60, // default frequency in minutes
      },
    });

    // State for collapsible sections
    const isScrapeOptionsCollapsed = ref(true);
    const isPageOptionsCollapsed = ref(true);

    const loading = ref(false);
    const error = ref('');
    const result = ref<ScrapeResult | null>(null);
    const downloadFormats = computed(() =>
      Array.from(new Set(['json', ...formData.value.scrapeOptions.formats])),
    );

    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    const handleSubmit = async () => {
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

      // Construct the request payload matching the ScrapeAndExtractFromUrlRequest interface
      const requestPayload: ScrapeAndExtractFromUrlRequest = {
        url: formData.value.url,
        ...(formData.value.pageOptions.waitFor !== undefined &&
          formData.value.pageOptions.waitFor > 0 && {
            waitFor: formData.value.pageOptions.waitFor,
          }),
        ...(formData.value.pageOptions.mobile === true && { mobile: true }), // Default is false
        ...(formData.value.pageOptions.skipTlsVerification === true && {
          skipTlsVerification: true,
        }), // Default is false
        ...(formData.value.pageOptions.timeout !== undefined &&
          formData.value.pageOptions.timeout > 0 &&
          formData.value.pageOptions.timeout !== 30000 && {
            timeout: formData.value.pageOptions.timeout,
          }), // Default is 30000
        ...(formData.value.pageOptions.blockAds === false && {
          blockAds: false,
        }), // Default is true
        ...(formData.value.pageOptions.removeBase64Images === false && {
          removeBase64Images: false,
        }), // Default is true
        ...(formData.value.pageOptions.proxy &&
          formData.value.pageOptions.proxy !== '' && {
            proxy: formData.value.pageOptions.proxy as 'basic' | 'stealth',
          }),
        ...(formData.value.pageOptions.headers &&
          Object.keys(formData.value.pageOptions.headers).length > 0 && {
            headers: formData.value.pageOptions.headers,
          }),
        // Removed incorrect mapping of HTTP action to API actions
        ...(formData.value.pageOptions.location &&
          formData.value.pageOptions.location !== '' && {
            location: { country: formData.value.pageOptions.location },
          }), // Map location string to Location object with 'country' property

        // Include scrapeOptions properties directly
        formats: formData.value.scrapeOptions
          .formats as unknown as ScrapeAndExtractFromUrlRequestFormatsEnum[],
        ...(formData.value.scrapeOptions.onlyMainContent === false && {
          onlyMainContent: false,
        }), // Default is true
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

        // Include extractorOptions and changeTrackingOptions directly if they exist
        ...(formData.value.scrapeOptions.formats.includes(
          ScrapeAndExtractFromUrlRequestFormatsEnum.Extract,
        ) &&
          formData.value.extractorOptions &&
          Object.keys(formData.value.extractorOptions).length > 0 && {
            extract: formData.value.extractorOptions as ScrapeAndExtractFromUrlRequestExtract,
          }),
        ...(formData.value.scrapeOptions.formats.includes('changeTracking') && {
          changeTrackingOptions: {
            threshold: formData.value.changeTrackingOptions?.threshold ?? 10,
            frequency: formData.value.changeTrackingOptions?.frequency ?? 60,
          },
        }),
      };

      // Clean up potentially empty nested objects if they were structured differently before
      // (Not strictly necessary with the direct property approach above, but good practice if objects were used)
      // Example: if (requestPayload.pageOptions && Object.keys(requestPayload.pageOptions).length === 0) {
      //   delete requestPayload.pageOptions;
      // }

      try {
        loading.value = true;
        error.value = '';
        console.log('Sending scrape request:', JSON.stringify(requestPayload, null, 2)); // Log payload for debugging
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
          error.value = 'An unexpected error occurred';
        }
      } finally {
        loading.value = false;
      }
    };

    const downloadResult = (format: string) => {
      if (!result.value?.data) return;

      const formatMap: Record<string, string> = {
        extract: 'llm_extraction',
        'screenshot@fullPage': 'screenshot',
      };

      const key = formatMap[format] ?? format;
      const data: unknown =
        format === 'json'
          ? result.value.data
          : result.value.data[key as keyof typeof result.value.data];

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
        contentStr = JSON.stringify(data, null, 2);
      }

      const dataUri = `data:${mimeType};charset=utf-8,${encodeURIComponent(contentStr)}`;
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `scrape-result-${format}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // JSON validation for extractorOptions textarea
    const extractorOptionsJson = ref(
      JSON.stringify(formData.value.extractorOptions || {}, null, 2),
    );
    const extractorOptionsError = ref('');

    watch(extractorOptionsJson, (newVal) => {
      try {
        formData.value.extractorOptions = newVal ? JSON.parse(newVal) : {};
        extractorOptionsError.value = '';
      } catch (e) {
        extractorOptionsError.value = 'Invalid JSON format';
      }
    });

    // JSON string for headers textarea binding
    const headersJson = ref(JSON.stringify(formData.value.pageOptions.headers || {}, null, 2));

    // Watch headersJson and update formData.pageOptions.headers accordingly
    watch(headersJson, (newVal) => {
      try {
        formData.value.pageOptions.headers = newVal ? JSON.parse(newVal) : {};
      } catch {
        // Ignore JSON parse errors, keep previous headers
      }
    });

    return {
      formData,
      loading,
      headersJson,
      error,
      result,
      handleSubmit,
      downloadResult,
      downloadFormats,
      extractorOptionsJson,
      extractorOptionsError,
      ScrapeAndExtractFromUrlRequestFormatsEnum, // Expose enum for template
      isScrapeOptionsCollapsed,
      isPageOptionsCollapsed,
    };
  },
});
</script>

<style scoped>
.scrape-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
.form-group {
  margin-bottom: 20px; /* Increased margin */
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* Responsive grid */
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

.error {
  background: #fff0f0;
  color: #cc0000;
}

.collapsible-header {
  cursor: pointer;
}

.result {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f9f9f9;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.result-header h2 {
  margin: 0;
}

.download-options button {
  margin-left: 10px;
  padding: 5px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.download-options button:hover {
  background-color: #0056b3;
}

.result pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #eee;
  color: #333;
  padding: 10px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.error-message {
  color: red;
  font-size: 0.9em;
  margin-top: 5px;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #0066cc;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
