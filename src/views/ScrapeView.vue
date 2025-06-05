<template>
  <div class="scrape-view">
    <h1>Scrape a URL</h1>
    <form @submit.prevent="submit">
      <div class="form-group">
        <label for="url">URL</label>
        <input id="url" v-model="form.url" required placeholder="https://example.com" />
      </div>
      <div class="form-group">
        <label for="formats">Formats</label>
        <select id="formats" v-model="form.formats" multiple>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="rawHtml">Raw HTML</option>
          <option value="links">Links</option>
          <option value="screenshot">Screenshot</option>
          <option value="screenshot@fullPage">Screenshot Full Page</option>
          <option value="json">JSON</option>
          <option value="changeTracking">Change Tracking</option>
        </select>
      </div>
      <label>
        <input type="checkbox" v-model="form.onlyMainContent" /> Only Main Content
      </label>
      <div class="form-group">
        <label>Include Tags</label>
        <input v-model="includeTags" placeholder="p,div" />
      </div>
      <div class="form-group">
        <label>Exclude Tags</label>
        <input v-model="excludeTags" placeholder="script,style" />
      </div>
      <div class="form-group">
        <label>Wait For (ms)</label>
        <input type="number" v-model.number="form.waitFor" min="0" />
      </div>
      <div class="form-group">
        <label>Timeout (ms)</label>
        <input type="number" v-model.number="form.timeout" min="0" />
      </div>
      <label><input type="checkbox" v-model="form.mobile" /> Mobile</label>
      <label><input type="checkbox" v-model="form.skipTlsVerification" /> Skip TLS Verification</label>
      <div class="form-group">
        <label>Proxy</label>
        <select v-model="form.proxy">
          <option value="">Default</option>
          <option value="basic">Basic</option>
          <option value="stealth">Stealth</option>
        </select>
      </div>
      <label><input type="checkbox" v-model="form.blockAds" /> Block Ads</label>
      <label><input type="checkbox" v-model="form.removeBase64Images" /> Remove Base64 Images</label>
      <div class="form-group">
        <label>Headers (JSON)</label>
        <textarea v-model="headersJson" rows="4" placeholder='{"User-Agent":"MyBot"}'></textarea>
      </div>
      <div class="form-group">
        <label>JSON Options</label>
        <textarea v-model="jsonOptionsJson" rows="4" placeholder='{"schema":{}}'></textarea>
      </div>
      <div class="form-group">
        <label>Change Tracking Options</label>
        <textarea v-model="changeTrackingJson" rows="4" placeholder='{"modes":["git-diff"]}'></textarea>
      </div>
      <button type="submit" :disabled="loading">{{ loading ? 'Processing...' : 'Scrape' }}</button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="resultData" class="result">
      <div class="result-header">
        <h2>Scrape Result</h2>
        <div class="download-options">
          <button @click="downloadJson">Download JSON</button>
          <button
            v-for="fmt in form.formats"
            :key="fmt"
            @click="downloadFormat(fmt)"
          >Download {{ fmt }}</button>
        </div>
      </div>
      <pre>{{ formattedResult }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed } from 'vue'
import axios from 'axios'
import apiConfig from '../config/api'

export default defineComponent({
  name: 'ScrapeView',
  setup() {
    const form = reactive({
      url: '',
      formats: ['markdown'] as string[],
      onlyMainContent: true,
      waitFor: 0,
      mobile: false,
      skipTlsVerification: false,
      timeout: 30000,
      proxy: '',
      blockAds: true,
      removeBase64Images: false
    })
    const includeTags = ref('')
    const excludeTags = ref('')
    const headersJson = ref('{}')
    const jsonOptionsJson = ref('')
    const changeTrackingJson = ref('')
    const loading = ref(false)
    const error = ref('')
    const resultData = ref<any | null>(null)
    const formattedResult = computed(() =>
      resultData.value ? JSON.stringify(resultData.value, null, 2) : ''
    )

    const submit = async () => {
      error.value = ''
      let headers: any = {}
      let jsonOptions: any = undefined
      let changeOptions: any = undefined
      try { headers = headersJson.value ? JSON.parse(headersJson.value) : {} } catch { error.value = 'Invalid headers JSON'; return }
      try { jsonOptions = jsonOptionsJson.value ? JSON.parse(jsonOptionsJson.value) : undefined } catch { error.value = 'Invalid JSON options'; return }
      try { changeOptions = changeTrackingJson.value ? JSON.parse(changeTrackingJson.value) : undefined } catch { error.value = 'Invalid change tracking options'; return }

      const payload: any = {
        url: form.url,
        formats: form.formats,
        onlyMainContent: form.onlyMainContent,
        headers: Object.keys(headers).length ? headers : undefined,
        waitFor: form.waitFor || undefined,
        mobile: form.mobile || undefined,
        skipTlsVerification: form.skipTlsVerification || undefined,
        timeout: form.timeout || undefined,
        proxy: form.proxy || undefined,
        blockAds: form.blockAds,
        removeBase64Images: form.removeBase64Images,
        jsonOptions,
        changeTrackingOptions: changeOptions
      }
      if (includeTags.value.trim()) payload.includeTags = includeTags.value.split(',').map(t => t.trim()).filter(Boolean)
      if (excludeTags.value.trim()) payload.excludeTags = excludeTags.value.split(',').map(t => t.trim()).filter(Boolean)
      loading.value = true
      try {
        const apiKey = localStorage.getItem('firecrawl_api_key') || ''
        const { data } = await axios.post(`${apiConfig.basePath}/scrape`, payload, { headers: { Authorization: `Bearer ${apiKey}` } })
        resultData.value = data
      } catch (e: any) {
        error.value = e.response?.data?.error || e.message
      } finally {
        loading.value = false
      }
    }

    const downloadJson = () => {
      if (!resultData.value) return
      const blob = new Blob([
        JSON.stringify(resultData.value, null, 2)
      ], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'scrape_result.json'
      a.click()
      URL.revokeObjectURL(url)
    }

    const downloadFormat = (fmt: string) => {
      if (!resultData.value) return
      const key = fmt.includes('@') ? fmt.split('@')[0] : fmt
      const data = (resultData.value as any).data?.[key]
      if (!data) return
      let content = ''
      let filename = `scrape_${key}`
      if (typeof data === 'object') {
        content = JSON.stringify(data, null, 2)
        filename += '.json'
      } else {
        content = String(data)
        if (key === 'markdown') filename += '.md'
        else if (key === 'html' || key === 'rawHtml') filename += '.html'
        else filename += '.txt'
      }
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }

    return {
      form,
      includeTags,
      excludeTags,
      headersJson,
      jsonOptionsJson,
      changeTrackingJson,
      loading,
      error,
      resultData,
      formattedResult,
      submit,
      downloadJson,
      downloadFormat
    }
  }
})
</script>

<style scoped>
.scrape-view {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: sans-serif;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #444;
}

button[type="submit"] {
  display: block;
  width: 100%;
  padding: 12px;
  background-color: #5cb85c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s ease;
  margin-top: 10px;
}

button[type="submit"]:hover:not(:disabled) {
  background-color: #4cae4c;
}

.error {
  background-color: #f2dede;
  border: 1px solid #ebccd1;
  color: #a94442;
  margin-top: 20px;
  padding: 15px;
  border-radius: 4px;
}

.result {
  background-color: #f9f9f9;
  border: 1px solid #eee;
  margin-top: 25px;
  padding: 15px;
  border-radius: 4px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.download-options button {
  margin-left: 10px;
  padding: 6px 12px;
  background-color: #337ab7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.download-options button:hover {
  background-color: #286090;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
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
