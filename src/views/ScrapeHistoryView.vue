<template>
  <div class="history-view">
    <h1>Scrape History</h1>
    <ul v-if="history.length">
      <li v-for="item in history" :key="item.id">
        <strong>{{ item.id }}</strong>
        <button v-if="item.result" @click="download(item)">Download JSON</button>
      </li>
    </ul>
    <p v-else>No history yet.</p>
  </div>
</template>

<script setup lang="ts">
import { useHistory } from '../composables/useHistory'

const { history } = useHistory('scrape')

function download(item: any) {
  const blob = new Blob([JSON.stringify(item.result, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${item.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.history-view { max-width: 600px; margin: 0 auto; }
button { margin-left: 1rem; }
</style>
