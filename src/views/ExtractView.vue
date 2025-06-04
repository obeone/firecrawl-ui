<template>
  <div class="extract-view">
    <h1>Extraction de Données</h1>
    <router-link to="/extract/history">Voir l'historique</router-link>

    <!-- Formulaire pour les URLs et les options -->
    <form @submit.prevent="submitExtraction">
      <div class="form-group">
        <label for="urls">URLs (format <a href="https://docs.firecrawl.dev/api-reference/endpoint/extract#url-glob-patterns" target="_blank" rel="noopener noreferrer">glob</a>, une par ligne) :</label>
        <textarea id="urls" v-model="urls" rows="5" placeholder="Ex: https://example.com/blog/*" required></textarea>
      </div>

      <!-- Options d'extraction -->
      <div class="form-group">
        <label for="prompt">Prompt d'extraction :</label>
        <textarea id="prompt" v-model="extractionPrompt" rows="3" placeholder="Ex: Extraire le titre, l'auteur et la date de publication de l'article."></textarea>
      </div>

      <div class="form-group">
        <label for="schema">Schéma JSON (optionnel) :</label>
        <textarea id="schema" v-model="jsonSchemaString" rows="5" placeholder='Ex: {\n  "title": "string",\n  "author": "string",\n  "publishedDate": "string"\n}'></textarea>
        <small v-if="schemaError" class="schema-error">Erreur de format JSON: {{ schemaError }}</small>
      </div>

      <!-- Autres options (Exemple) -->
      <!--
      <div class="form-group options-extra">
        <label>Autres options :</label>
        <label>
          <input type="checkbox" v-model="options.enableWebSearch"> Activer la recherche web
        </label>
         <label>
          <input type="checkbox" v-model="options.showSources"> Afficher les sources
        </label>
      </div>
      -->

      <button type="submit" :disabled="loading || !!schemaError">
        {{ loading ? 'Extraction en cours...' : 'Extraire les Données' }}
      </button>
    </form>

    <!-- Affichage des résultats -->
    <div v-if="loading && !results" class="loading">Extraction en cours...
      <ProgressBar :value="progress" />
    </div>
    <div v-if="error" class="error">Erreur : {{ error }}</div>
    <div v-if="results" class="results">
      <div class="results-header">
        <h2>Résultats de l'Extraction :</h2>
        <button @click="downloadResults" :disabled="!results">Télécharger JSON</button>
      </div>
      <pre>{{ formattedResults }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue'
import axios from 'axios'
import type { ExtractionApi, ExtractResponse } from '@/api-client'
import apiConfig from '../config/api'
import { useHistory } from '../composables/useHistory'
import ProgressBar from '../components/ProgressBar.vue'

// Injecter le client API
const api = inject<{ extraction: ExtractionApi }>('api');
if (!api) {
  throw new Error("API client n'est pas fourni");
}

// --- State ---
const urls = ref(''); // URLs in glob format, one per line
const extractionPrompt = ref(''); // Prompt for extraction
const jsonSchemaString = ref(''); // JSON schema as a string
const loading = ref(false);
const error = ref<string | null>(null);
const results = ref<ExtractResponse['data'] | null>(null); // Store extraction results
const schemaError = ref<string | null>(null); // Store JSON schema parsing errors
const progress = ref(0)
const { add, update } = useHistory('extract')

// --- Computed Properties ---

// Computed property to parse JSON schema string and handle errors
const parsedJsonSchema = computed(() => {
  if (!jsonSchemaString.value.trim()) {
    schemaError.value = null;
    return undefined; // Return undefined if schema is empty
  }
  try {
    const schema = JSON.parse(jsonSchemaString.value);
    schemaError.value = null; // Clear error on successful parse
    return schema;
  } catch (e: any) {
    schemaError.value = e.message; // Set error message
    return null; // Return null indicates parsing error
  }
});

// Computed property to format results as pretty JSON string
const formattedResults = computed(() => {
  return results.value ? JSON.stringify(results.value, null, 2) : '';
});

// Watch for changes in jsonSchemaString to validate JSON in real-time
watch(jsonSchemaString, (newValue) => {
  if (!newValue.trim()) {
    schemaError.value = null;
    return;
  }
  try {
    JSON.parse(newValue);
    schemaError.value = null;
  } catch (e: any) {
    schemaError.value = e.message;
  }
});


// --- Methods ---

// Function to handle the extraction submission
const submitExtraction = async () => {
  // Prevent submission if schema is invalid
  if (schemaError.value) {
    error.value = "Veuillez corriger l'erreur dans le schéma JSON avant de soumettre.";
    return;
  }

  loading.value = true;
  progress.value = 0;
  error.value = null;
  // Keep previous results visible during loading? Optional: results.value = null;

  // Prepare URL list from textarea input
  const urlList = urls.value.split('\n').map(url => url.trim()).filter(url => url);
  if (urlList.length === 0) {
    error.value = "Veuillez fournir au moins une URL ou un pattern glob.";
    loading.value = false;
    return;
  }

  // Construct the request payload according to OpenAPI spec
  const requestPayload: ExtractRequest = {
    urls: urlList,
    // Only include extractionOptions if prompt or schema is provided
    ...( (extractionPrompt.value || parsedJsonSchema.value) && {
        extractionOptions: {
          ...(extractionPrompt.value && { prompt: extractionPrompt.value }),
          ...(parsedJsonSchema.value && { schema: parsedJsonSchema.value }),
          // Add other options like enableWebSearch, showSources if needed
          // enableWebSearch: options.value.enableWebSearch,
          // showSources: options.value.showSources,
        }
      }
    ),
    // Add scanOptions or scrapeOptions if needed
    // scanOptions: { ... },
    // scrapeOptions: { formats: ['markdown'] } // Example
  };

  try {
    const { data } = await axios.post(`${apiConfig.basePath}/extract`, requestPayload, apiConfig.baseOptions)
    const id = data.id
    add({ id, type: 'extract', status: 'extracting', createdAt: Date.now() })
    while (true) {
      const res = await axios.get(`${apiConfig.basePath}/extract/${id}`, apiConfig.baseOptions)
      const status = res.data.status
      update(id, { status, result: res.data })
      if (status === 'completed' || status === 'failed') {
        results.value = res.data.data
        break
      }
      if (res.data.total) {
        progress.value = Math.round((res.data.processed / res.data.total) * 100)
      }
      await new Promise(r => setTimeout(r, 2000))
    }
  } catch (err: any) {
    const errorMessage = err.response?.data?.error || err.message || 'Une erreur inconnue est survenue'
    error.value = `Erreur lors de l'extraction : ${errorMessage}`
    results.value = null
  } finally {
    loading.value = false
  }
};

// Function to download the results as a JSON file
const downloadResults = () => {
  if (!results.value) return;

  const dataStr = JSON.stringify(results.value, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  const exportFileDefaultName = 'extraction_results.json';

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click(); // Simulate click to trigger download
  linkElement.remove(); // Clean up the element
};

</script>

<style scoped>
.extract-view {
  max-width: 900px; /* Increased width */
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: sans-serif;
}

h1, h2 {
  text-align: center;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #444; /* Slightly darker label color */
}

textarea, input[type="checkbox"], input[type="text"] { /* Added input[type="text"] */
  margin-right: 5px;
  margin-top: 3px; /* Added small top margin */
}

textarea {
  width: 100%;
  padding: 10px; /* Increased padding */
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-family: 'Courier New', Courier, monospace; /* Monospace for code/schema */
  font-size: 0.9em;
  margin-bottom: 5px; /* Space below textarea */
}

/* Style for the schema error message */
.schema-error {
  color: #d9534f; /* Bootstrap danger color */
  font-size: 0.85em;
  display: block;
  margin-top: -2px; /* Adjust position */
}

/* Style for extra options section if uncommented */
.options-extra label {
  display: inline-block;
  margin-right: 15px;
  font-weight: normal;
}

button[type="submit"] { /* Target submit button specifically */
  display: block;
  width: 100%;
  padding: 12px; /* Increased padding */
  background-color: #5cb85c; /* Bootstrap success color */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s ease; /* Smooth transition */
  margin-top: 10px; /* Add margin above button */
}

button:disabled {
  background-color: #aaa; /* Darker disabled color */
  cursor: not-allowed;
}

button[type="submit"]:hover:not(:disabled) {
  background-color: #4cae4c; /* Darker green on hover */
}

.loading, .error, .results {
  margin-top: 25px; /* Increased margin */
  padding: 15px;
  border-radius: 4px;
  border: 1px solid transparent; /* Base border */
}

.loading {
  background-color: #f0f0f0; /* Lighter gray */
  border-color: #ddd;
  text-align: center;
  color: #555;
}

.error {
  background-color: #f2dede; /* Bootstrap danger background */
  border-color: #ebccd1; /* Bootstrap danger border */
  color: #a94442; /* Bootstrap danger text */
}

.results {
  background-color: #f9f9f9; /* Very light gray */
  border-color: #eee;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px; /* Space between header and pre */
}

.results-header h2 {
  margin: 0; /* Remove default margin */
  text-align: left; /* Align header text left */
}

.results-header button {
  padding: 6px 12px;
  background-color: #337ab7; /* Bootstrap primary color */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.results-header button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

.results-header button:hover:not(:disabled) {
  background-color: #286090; /* Darker blue on hover */
}


pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #fff;
  padding: 15px; /* Increased padding */
  border: 1px solid #ddd; /* Slightly darker border */
  border-radius: 4px;
  max-height: 500px; /* Increased max height */
  overflow-y: auto;
  font-size: 0.9em; /* Slightly smaller font */
  line-height: 1.4; /* Improved line spacing */
}

/* Link style for glob format info */
a {
  color: #337ab7;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
</style>
