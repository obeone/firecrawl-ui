<template>
  <div class="map-view">
    <h2>MapView Component</h2>
    <form @submit.prevent="handleSubmit" class="map-form">
      <div class="form-group">
        <label for="baseUrl">Base URL:</label>
        <input
          id="baseUrl"
          v-model="baseUrl"
          type="url"
          placeholder="Enter base URL"
          required
        />
      </div>

      <div class="form-group">
        <label for="mappingOptions">Mapping Options (JSON):</label>
        <textarea
          id="mappingOptions"
          v-model="mappingOptionsText"
          placeholder='e.g. { "key": "value" }'
          rows="5"
        ></textarea>
      </div>

      <button type="submit">Find URLs</button>
    </form>

    <div v-if="urls.length" class="results">
      <h3>Found URLs</h3>
      <ul>
        <li v-for="(url, index) in urls" :key="index">{{ url }}</li>
      </ul>
      <button @click="downloadJson">Download JSON</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

/**
 * MapView component logic
 * - baseUrl: the base URL input by the user
 * - mappingOptionsText: JSON string for mapping options input
 * - urls: array of found URLs to display
 */
const baseUrl = ref('');
const mappingOptionsText = ref('');
const urls = ref([]);

/**
 * Handle form submission
 * Parses mapping options JSON and simulates URL finding logic
 */
function handleSubmit() {
  let options = {};
  try {
    options = mappingOptionsText.value ? JSON.parse(mappingOptionsText.value) : {};
  } catch (e) {
    alert('Invalid JSON in mapping options');
    return;
  }

  // Simulate URL finding logic based on baseUrl and options
  // For demonstration, just create some dummy URLs
  urls.value = [
    baseUrl.value,
    baseUrl.value + '/page1',
    baseUrl.value + '/page2?param=' + (options.param || 'default'),
  ];
}

/**
 * Download the found URLs as a JSON file
 */
function downloadJson() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(urls.value, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'urls.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
</script>

<style scoped>
.map-view {
  max-width: 600px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: Arial, sans-serif;
}

.map-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

input[type='url'],
textarea {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #aaa;
  border-radius: 4px;
}

button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #005fa3;
}

.results {
  margin-top: 1.5rem;
}

.results ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
</style>
