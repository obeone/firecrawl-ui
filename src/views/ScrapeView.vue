<template>
  <div class="scrape-config-container">
    <h1>Scrape Configuration</h1>
    
    <form class="scrape-config-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="url">URL:</label>
        <input id="url" v-model="formData.url" type="text" required>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="formData.scrapeOptions.onlyMainContent">
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
        <label for="changeModes">Change Tracking Modes:</label>
        <select id="changeModes" v-model="changeTrackingModes" multiple>
          <option value="git-diff">git-diff</option>
          <option value="json">json</option>
        </select>
        <small>Select modes for change tracking.</small>

        <label for="changeSchema">Change Tracking Schema (JSON):</label>
        <textarea id="changeSchema" v-model="changeTrackingSchemaJson" rows="4"></textarea>
        <small>Define JSON schema when using json mode.</small>

        <label for="changePrompt">Change Tracking Prompt:</label>
        <textarea id="changePrompt" v-model="formData.changeTrackingOptions.prompt" rows="2"></textarea>
      </div>

      <fieldset class="form-group options-fieldset">
        <legend class="collapsible-header" @click="isScrapeOptionsCollapsed = !isScrapeOptionsCollapsed">Scrape Options</legend>
        <div v-show="!isScrapeOptionsCollapsed">
          <label>
            <input type="checkbox" v-model="formData.scrapeOptions.onlyMainContent">
            Only Main Content (exclude headers, footers, etc.)
          </label>
          <div class="form-group">
            <label for="includeTags">Include Tags (comma separated):</label>
            <input id="includeTags" type="text" v-model="formData.scrapeOptions.includeTags" placeholder="e.g. p, div, span">
          </div>
          <div class="form-group">
            <label for="excludeTags">Exclude Tags (comma separated):</label>
            <input id="excludeTags" type="text" v-model="formData.scrapeOptions.excludeTags" placeholder="e.g. script, style">
          </div>
        </div>
      </fieldset>

      <fieldset class="form-group options-fieldset">
        <legend class="collapsible-header" @click="isPageOptionsCollapsed = !isPageOptionsCollapsed">Page Options</legend>
        <div v-show="!isPageOptionsCollapsed">
          <div class="grid-layout">
            <div class="form-group">
              <label for="waitFor">Wait For (ms):</label>
              <input id="waitFor" v-model.number="formData.pageOptions.waitFor" type="number" min="0">
              <small>Delay before fetching content.</small>
            </div>
            <div class="form-group">
              <label for="timeout">Timeout (ms):</label>
              <input id="timeout" v-model.number="formData.pageOptions.timeout" type="number" min="0">
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
              <input type="checkbox" v-model="formData.pageOptions.mobile">
              Emulate Mobile Device
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.pageOptions.skipTlsVerification">
              Skip TLS Verification
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.pageOptions.blockAds">
              Block Ads & Popups
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.pageOptions.removeBase64Images">
              Remove Base64 Images
            </label>
          </div>
          <div class="form-group">
            <label for="headers">HTTP Headers (JSON format):</label>
            <textarea id="headers" v-model="headersJson" rows="4" placeholder='{"Authorization": "Bearer token", "Accept": "application/json"}'></textarea>
            <small>Enter HTTP headers as JSON object.</small>
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

      <div v-if="formData.scrapeOptions.formats.includes('json')" class="form-group">
        <label for="jsonOptions">JSON Options:</label>
        <textarea id="jsonOptions" v-model="jsonOptionsJson" rows="8" placeholder='{"schema": {}}'></textarea>
        <small>Enter JSON extraction options.</small>
        <div v-if="jsonOptionsError" class="error-message">{{ jsonOptionsError }}</div>
      </div>
      <div class="form-group">
        <label for="actions">Actions (JSON array):</label>
        <textarea id="actions" v-model="actionsJson" rows="6" placeholder='[{"type":"wait","milliseconds":1000}]'></textarea>
        <small>Specify advanced actions to perform before scraping.</small>
        <div v-if="actionsError" class="error-message">{{ actionsError }}</div>
      </div>

      <button type="submit">Scrape</button>
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
        <h2>Results</h2>
        <div class="download-options">
          <button @click="downloadResult('json')">Download JSON</button>
          <button @click="downloadResult('csv')">Download CSV</button>
          <button @click="downloadResult('txt')">Download Text</button>
        </div>
      </div>
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
// Removed duplicate imports for ScrapingApi and ScrapeResponse from the block below
import {
  ScrapeAndExtractFromUrlRequestFormatsEnum,
  type ScrapeAndExtractFromUrlRequest, // Correct type for the request object
  type ScrapeResponse, // Correct type for the response - KEEP THIS ONE
  type ScrapingApi, // Correct type for the API - KEEP THIS ONE
  // Types for nested options within ScrapeAndExtractFromUrlRequest (if needed for clarity, but often optional)
  // type ScrapeAndExtractFromUrlRequestPageOptions, // Example if it existed
  // type ScrapeAndExtractFromUrlRequestScrapeOptions, // Example if it existed
  type ScrapeAndExtractFromUrlRequestExtract, // Correct type for extractor options
  // type ScrapeAndExtractFromUrlRequestChangeTrackingOptions // Example if it existed
} from '../api-client/api'

type ScrapeResult = ScrapeResponse

// ----- Type Definitions -----
interface FormDataPageOptions {
  waitFor?: number
  mobile?: boolean
  skipTlsVerification?: boolean
  timeout?: number
  blockAds?: boolean
  removeBase64Images?: boolean
  proxy?: string | 'basic' | 'stealth'
  headers?: Record<string, string>
  location?: string
  actions?: any[]
}

interface FormDataScrapeOptions {
  formats: string[]
  onlyMainContent?: boolean
  includeTags?: string
  excludeTags?: string
}

interface JsonOptions extends Partial<ScrapeAndExtractFromUrlRequestExtract> {}

interface ChangeTrackingOptions {
  modes: string[]
  schema?: object
  prompt?: string
}

interface FormData {
  url: string
  pageOptions: FormDataPageOptions
  scrapeOptions: FormDataScrapeOptions
  jsonOptions?: JsonOptions
  changeTrackingOptions: ChangeTrackingOptions
}


export default defineComponent({
  name: 'ScrapeView',
  setup() {
    const router = useRouter()
    const api = inject('api') as { scraping: ScrapingApi }
    
    // Initialize formData with nested structure and default values
    const formData = ref<FormData>({
      url: '',
      pageOptions: {
        waitFor: undefined,
        mobile: false,
        skipTlsVerification: false,
        timeout: undefined,
        blockAds: true,
        removeBase64Images: true,
        proxy: '',
        headers: {},
        location: '',
        actions: [],
      },
      scrapeOptions: {
        onlyMainContent: true,
        formats: [ScrapeAndExtractFromUrlRequestFormatsEnum.Markdown],
        includeTags: '',
        excludeTags: ''
      },
      jsonOptions: {},
      changeTrackingOptions: {
        modes: [],
        schema: undefined,
        prompt: ''
      }
    })

    // State for collapsible sections
    const isScrapeOptionsCollapsed = ref(true);
    const isPageOptionsCollapsed = ref(true);

    const loading = ref(false)
    const error = ref('')
    const result = ref<ScrapeResult | null>(null)

    const isValidUrl = (url: string) => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }

    const handleSubmit = async () => {
      if (!isValidUrl(formData.value.url)) {
        error.value = 'Please enter a valid URL (e.g. https://example.com)'
        return
      }

      if (!formData.value.scrapeOptions.formats || formData.value.scrapeOptions.formats.length === 0) {
        error.value = 'Please select at least one output format'
        return
      }

      // Construct the request payload matching the ScrapeAndExtractFromUrlRequest interface
      const requestPayload: ScrapeAndExtractFromUrlRequest = {
        url: formData.value.url,
        ...(formData.value.pageOptions.waitFor !== undefined && formData.value.pageOptions.waitFor > 0 && { waitFor: formData.value.pageOptions.waitFor }),
        ...(formData.value.pageOptions.mobile === true && { mobile: true }), // Default is false
        ...(formData.value.pageOptions.skipTlsVerification === true && { skipTlsVerification: true }), // Default is false
        ...(formData.value.pageOptions.timeout !== undefined && formData.value.pageOptions.timeout > 0 && formData.value.pageOptions.timeout !== 30000 && { timeout: formData.value.pageOptions.timeout }), // Default is 30000
        ...(formData.value.pageOptions.blockAds === false && { blockAds: false }), // Default is true
        ...(formData.value.pageOptions.removeBase64Images === false && { removeBase64Images: false }), // Default is true
        ...(formData.value.pageOptions.proxy && formData.value.pageOptions.proxy !== '' && { proxy: formData.value.pageOptions.proxy as ('basic' | 'stealth') }),
        ...(formData.value.pageOptions.headers && Object.keys(formData.value.pageOptions.headers).length > 0 && { headers: formData.value.pageOptions.headers }),
        ...(formData.value.pageOptions.actions && formData.value.pageOptions.actions.length > 0 && { actions: formData.value.pageOptions.actions }),
        ...(formData.value.pageOptions.location && formData.value.pageOptions.location !== '' && { location: { country: formData.value.pageOptions.location } }), // Map location string to Location object with 'country' property

        // Include scrapeOptions properties directly
        formats: formData.value.scrapeOptions.formats as unknown as ScrapeAndExtractFromUrlRequestFormatsEnum[],
        ...(formData.value.scrapeOptions.onlyMainContent === false && { onlyMainContent: false }), // Default is true
        ...(formData.value.scrapeOptions.includeTags && formData.value.scrapeOptions.includeTags.trim() !== '' && { includeTags: formData.value.scrapeOptions.includeTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') }),
        ...(formData.value.scrapeOptions.excludeTags && formData.value.scrapeOptions.excludeTags.trim() !== '' && { excludeTags: formData.value.scrapeOptions.excludeTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') }),

        // Include jsonOptions and changeTrackingOptions when provided
        ...(formData.value.scrapeOptions.formats.includes('json') &&
          formData.value.jsonOptions && Object.keys(formData.value.jsonOptions).length > 0 && {
            jsonOptions: formData.value.jsonOptions as ScrapeAndExtractFromUrlRequestExtract,
          }),
        ...(formData.value.scrapeOptions.formats.includes('changeTracking') && {
          changeTrackingOptions: {
            ...(formData.value.changeTrackingOptions.modes.length > 0 && {
              modes: formData.value.changeTrackingOptions.modes,
            }),
            ...(formData.value.changeTrackingOptions.schema && {
              schema: formData.value.changeTrackingOptions.schema,
            }),
            ...(formData.value.changeTrackingOptions.prompt && {
              prompt: formData.value.changeTrackingOptions.prompt,
            }),
          },
        })
      };

      // Clean up potentially empty nested objects if they were structured differently before
      // (Not strictly necessary with the direct property approach above, but good practice if objects were used)
      // Example: if (requestPayload.pageOptions && Object.keys(requestPayload.pageOptions).length === 0) {
      //   delete requestPayload.pageOptions;
      // }

      try {
        loading.value = true
        error.value = ''
        console.log('Sending scrape request:', JSON.stringify(requestPayload, null, 2)); // Log payload for debugging
        const response = await api.scraping.scrapeAndExtractFromUrl(requestPayload)
        result.value = response.data
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('401')) {
            router.push({ name: 'ApiConfig' })
            return
          }
          error.value = err.message.includes('404') 
            ? 'Page not found (404)'
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

    const downloadResult = (format: string) => {
      if (!result.value?.data) return
      
      let dataStr, mimeType, extension
      const dataToExport = result.value.data
      
      switch(format) {
        case 'csv':
          const headers = Object.keys(dataToExport).filter(
            key => key !== 'metadata' && typeof dataToExport[key as keyof typeof dataToExport] !== 'object'
          )
          dataStr = headers.join(',') + '\n'
          dataStr += headers.map(header => `"${dataToExport[header as keyof typeof dataToExport] ?? ''}"`).join(',')
          mimeType = 'text/csv'
          extension = 'csv'
          break
          
        case 'txt':
          dataStr = JSON.stringify(dataToExport, null, 2)
          mimeType = 'text/plain'
          extension = 'txt'
          break
          
        default: // json
          dataStr = JSON.stringify(dataToExport, null, 2)
          mimeType = 'application/json'
          extension = 'json'
      }
      
      const dataUri = `data:${mimeType};charset=utf-8,${encodeURIComponent(dataStr)}`
      const link = document.createElement('a')
      link.setAttribute('href', dataUri)
      link.setAttribute('download', `scrape-result.${extension}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    // JSON validation for jsonOptions textarea
    const jsonOptionsJson = ref(JSON.stringify(formData.value.jsonOptions || {}, null, 2))
    const jsonOptionsError = ref('')

    watch(jsonOptionsJson, (newVal) => {
      try {
        formData.value.jsonOptions = newVal ? JSON.parse(newVal) : {}
        jsonOptionsError.value = ''
      } catch (e) {
        jsonOptionsError.value = 'Invalid JSON format'
      }
    })

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

    // Actions JSON handling
    const actionsJson = ref(
      JSON.stringify(formData.value.pageOptions.actions || [], null, 2),
    );
    const actionsError = ref('');
    watch(actionsJson, (val) => {
      try {
        formData.value.pageOptions.actions = val ? JSON.parse(val) : [];
        actionsError.value = '';
      } catch {
        actionsError.value = 'Invalid JSON format';
      }
    });

    const changeTrackingSchemaJson = ref(
      JSON.stringify(formData.value.changeTrackingOptions.schema || {}, null, 2),
    );
    const changeTrackingModes = ref<string[]>([]);
    watch(changeTrackingSchemaJson, (val) => {
      try {
        formData.value.changeTrackingOptions.schema = val ? JSON.parse(val) : undefined;
      } catch {
        /* ignore JSON errors */
      }
    });
    watch(changeTrackingModes, (val) => {
      formData.value.changeTrackingOptions.modes = val;
    });

    return {
      formData,
      loading,
      headersJson,
      error,
      result,
      handleSubmit,
      downloadResult,
      jsonOptionsJson,
      jsonOptionsError,
      actionsJson,
      actionsError,
      changeTrackingSchemaJson,
      changeTrackingModes,
      ScrapeAndExtractFromUrlRequestFormatsEnum, // Expose enum for template
      isScrapeOptionsCollapsed,
      isPageOptionsCollapsed,
    }
  }
})
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
.checkbox-label { /* Style for labels containing checkboxes */
  display: flex;
  align-items: center;
  gap: 5px;
}
.form-group small { /* Style for help text */
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
