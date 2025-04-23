<template>
  <div class="scrape-view">
    <h1>Scrape Configuration</h1>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="url">URL:</label>
        <input id="url" v-model="formData.url" type="text" required>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="formData.onlyMainContent">
          Only Main Content
        </label>
      </div>

      <div class="form-group">
        <label for="formats">Output Format:</label>
        <select id="formats" v-model="formData.formats" multiple>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="rawHtml">Raw HTML</option>
        </select>
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
import { defineComponent, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { ScrapingApi, ScrapeResponse } from '../api-client/api'
import { ScrapeAndExtractFromUrlRequestFormatsEnum } from '../api-client/api'

type ScrapeResult = ScrapeResponse

export default defineComponent({
  name: 'ScrapeView',
  setup() {
    const router = useRouter()
    const api = inject('api') as { scraping: ScrapingApi }
    const formData = ref({
      url: '',
      onlyMainContent: false,
      formats: [ScrapeAndExtractFromUrlRequestFormatsEnum.Markdown]
    })
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

      if (formData.value.formats.length === 0) {
        error.value = 'Please select at least one output format'
        return
      }

      try {
        loading.value = true
        error.value = ''
        const response = await api.scraping.scrapeAndExtractFromUrl({
          url: formData.value.url,
          formats: formData.value.formats,
          onlyMainContent: formData.value.onlyMainContent
        })
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

    return {
      formData,
      loading,
      error,
      result,
      handleSubmit,
      downloadResult
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
  margin-bottom: 15px;
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

.download-options {
  display: flex;
  gap: 10px;
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
