<template>
  <div class="crawl-view">
    <h1>Crawl Configuration</h1>
    <form @submit.prevent="handleSubmit">
      <!-- URL Section -->
      <div class="form-group">
        <label for="url">Base URL to Crawl:</label>
        <input id="url" v-model="formData.url" type="text" required placeholder="https://example.com" />
      </div>

      <!-- Crawler Options Section -->
      <fieldset class="form-group options-fieldset">
        <legend>Crawler Options</legend>
        <div class="grid-layout">
          <div class="form-group">
            <label for="includes">Includes (Regex Patterns):</label>
            <input id="includes" v-model="includesInput" type="text" placeholder="/blog/.*, /products/.*" @blur="parseIncludes" />
            <small>Comma-separated regex patterns. Only matching URLs will be included.</small>
          </div>
          <div class="form-group">
            <label for="excludes">Excludes (Regex Patterns):</label>
            <input id="excludes" v-model="excludesInput" type="text" placeholder="/login, /private/.*" @blur="parseExcludes" />
            <small>Comma-separated regex patterns to exclude URLs.</small>
          </div>
          <div class="form-group">
            <label for="maxDepth">Max Depth:</label>
            <input id="maxDepth" v-model.number="formData.crawlerOptions.maxDepth" type="number" min="1" placeholder="e.g. 3" />
            <small>Maximum depth relative to the base URL (path segments).</small>
          </div>
          <div class="form-group">
            <label for="maxDepthDiscovery">Max Discovery Depth:</label>
            <input id="maxDepthDiscovery" v-model.number="formData.crawlerOptions.maxDepthDiscovery" type="number" min="1" placeholder="e.g. 2" />
            <small>Maximum depth based on discovery order.</small>
          </div>
          <div class="form-group">
            <label for="limit">Page Limit:</label>
            <input id="limit" v-model.number="formData.crawlerOptions.limit" type="number" min="1" placeholder="e.g. 100" />
            <small>Maximum number of pages to crawl (default: 10000).</small>
          </div>
        </div>
        <div class="grid-layout">
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.crawlerOptions.ignoreSitemap" />
            Ignore Sitemap
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.crawlerOptions.allowPathRevisits" />
            Allow Path Revisits
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
      </fieldset>

      <!-- Scrape Options Section -->
      <fieldset class="form-group options-fieldset">
        <legend>Scrape Options</legend>
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
        <!-- TODO: Add includeTags and excludeTags if needed -->
      </fieldset>

      <!-- Webhook Options Section -->
      <fieldset class="form-group options-fieldset">
        <legend>Webhook Options (Optional)</legend>
        <div class="grid-layout">
          <div class="form-group">
            <label for="webhookUrl">Webhook URL:</label>
            <input id="webhookUrl" v-model="formData.webhookOptions.url" type="text" placeholder="https://your-service.com/webhook" />
          </div>
          <div class="form-group">
            <label for="webhookSecret">Webhook Secret:</label>
            <input id="webhookSecret" v-model="formData.webhookOptions.secret" type="text" placeholder="Secret for verification" />
          </div>
          <div class="form-group">
            <label for="webhookEvent">Webhook Event:</label>
            <select id="webhookEvent" v-model="formData.webhookOptions.event">
              <option value="">Select event</option>
              <option value="started">Started</option>
              <option value="page">Page</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
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
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
// Import the crawling API client (adjust import path as needed)
import { type CrawlingApi } from '../api-client/api'

/**
 * Interface for Crawler Options section of the form.
 */
interface CrawlerOptions {
  includes?: string[];
  excludes?: string[];
  maxDepth?: number;
  maxDepthDiscovery?: number;
  ignoreSitemap?: boolean;
  allowPathRevisits?: boolean;
  limit?: number;
  allowExternalLinks?: boolean;
  navigateBacklinks?: boolean;
}

/**
 * Interface for Scrape Options section of the form.
 */
interface ScrapeOptions {
  formats: string[];
  onlyMainContent?: boolean;
  // includeTags?: string[];
  // excludeTags?: string[];
}

/**
 * Interface for Webhook Options section of the form.
 */
interface WebhookOptions {
  url?: string;
  secret?: string;
  event?: string;
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
  name: 'CrawlView',
  setup() {
    const router = useRouter()
    const api = inject('api') as { crawling: CrawlingApi }

    // Reactive form data with default values
    const formData = ref<FormData>({
      url: '',
      crawlerOptions: {
        includes: [],
        excludes: [],
        maxDepth: undefined,
        maxDepthDiscovery: undefined,
        ignoreSitemap: false,
        allowPathRevisits: false,
        limit: undefined,
        allowExternalLinks: false,
        navigateBacklinks: false,
      },
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
      webhookOptions: {
        url: '',
        secret: '',
        event: '',
      }
    })

    // Inputs for includes/excludes as comma-separated strings for user convenience
    const includesInput = ref('')
    const excludesInput = ref('')

    /**
     * Parse the includes input string into an array for the API payload.
     */
    const parseIncludes = () => {
      formData.value.crawlerOptions.includes = includesInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    }

    /**
     * Parse the excludes input string into an array for the API payload.
     */
    const parseExcludes = () => {
      formData.value.crawlerOptions.excludes = excludesInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    }

    const loading = ref(false)
    const error = ref('')
    const result = ref<any>(null)

    /**
     * Validate a URL string.
     * @param url - The URL to validate.
     * @returns True if valid, false otherwise.
     */
    const isValidUrl = (url: string) => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }

    /**
     * Handle form submission: validate, build payload, call API, handle result.
     */
    const handleSubmit = async () => {
      parseIncludes()
      parseExcludes()

      if (!isValidUrl(formData.value.url)) {
        error.value = 'Please enter a valid URL (e.g. https://example.com)'
        return
      }
      if (!formData.value.scrapeOptions.formats || formData.value.scrapeOptions.formats.length === 0) {
        error.value = 'Please select at least one output format'
        return
      }

      // Build the request payload according to the OpenAPI CrawlRequest schema
      const payload: any = {
        url: formData.value.url,
        crawlerOptions: {
          ...formData.value.crawlerOptions,
        },
        scrapeOptions: {
          ...formData.value.scrapeOptions,
        }
      }

      // Only include webhookOptions if at least one field is filled
      if (
        formData.value.webhookOptions.url ||
        formData.value.webhookOptions.secret ||
        formData.value.webhookOptions.event
      ) {
        payload.webhookOptions = { ...formData.value.webhookOptions }
      }

      try {
        loading.value = true
        error.value = ''
        result.value = null
        // Call the crawling API (adjust method name as needed)
        // @ts-ignore
        const response = await api.crawling.crawlUrls(payload)
        result.value = response.data
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('401')) {
            router.push({ name: 'ApiConfig' })
            return
          }
          error.value = err.message.includes('404')
            ? 'Resource not found (404)'
            : err.message.includes('Network Error')
            ? 'Network connection failed'
            : err.message
        } else {
          error.value = 'An unexpected error occurred'
        }
      } finally {
        loading.value = false
      }
    }

    return {
      formData,
      includesInput,
      excludesInput,
      parseIncludes,
      parseExcludes,
      loading,
      error,
      result,
      handleSubmit,
    }
  }
})
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
.error {
  background: #fff0f0;
  color: #cc0000;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0,102,204,0.3);
  border-radius: 50%;
  border-top-color: #0066cc;
  animation: spin 1s ease-in-out infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.error-icon {
  width: 20px;
  height: 20px;
  background: #cc0000;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.result pre {
  white-space: pre-wrap;
  background: #23272f;
  color: #f8f8f2;
  padding: 15px;
  border-radius: 4px;
  max-height: 500px;
  overflow: auto;
  font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
  font-size: 1rem;
  border: 1px solid #444857;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
</style>
