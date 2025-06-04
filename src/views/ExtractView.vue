<template>
  <div class="scrape-config-container">
    <h1>Data Extraction</h1>

    <!-- Form for URLs and options -->
    <form class="scrape-config-form" @submit.prevent="submitExtraction">
      <div class="form-group">
        <label for="urls">URLs (format <a href="https://docs.firecrawl.dev/api-reference/endpoint/extract#url-glob-patterns" target="_blank" rel="noopener noreferrer">glob</a>, one per line):</label>
        <textarea id="urls" v-model="urls" rows="5" placeholder="Ex: https://example.com/blog/*" required></textarea>
      </div>

      <!-- Extraction Options -->
      <div class="form-group">
        <label for="prompt">Extraction Prompt:</label>
        <textarea id="prompt" v-model="extractionPrompt" rows="3" placeholder="Ex: Extract the title, author, and publication date of the article."></textarea>
      </div>

      <div class="form-group">
        <label for="schema">JSON Schema (optional):</label>
        <textarea id="schema" v-model="jsonSchemaString" rows="5" placeholder='Ex: {\n  "title": "string",\n  "author": "string",\n  "publishedDate": "string"\n}'></textarea>
        <small v-if="schemaError" class="schema-error">JSON format error: {{ schemaError }}</small>
      </div>

      <!-- Other options (Example) -->
      <!--
      <div class="form-group options-extra">
        <label>Other options :</label>
        <label>
          <input type="checkbox" v-model="options.enableWebSearch"> Enable web search
        </label>
         <label>
          <input type="checkbox" v-model="options.showSources"> Show sources
        </label>
      </div>
      -->

      <button type="submit" :disabled="loading || !!schemaError">
        {{ loading ? 'Extracting...' : 'Extract Data' }}
      </button>
    </form>

    <!-- Display Results -->
    <div v-if="loading && !results" class="loading">Extracting...</div>
    <div v-if="error" class="error">Error: {{ error }}</div>
    <div v-if="results" class="results">
      <div class="results-header">
        <h2>Extraction Results:</h2>
        <button @click="downloadResults" :disabled="!results">Download JSON</button>
      </div>
      <pre>{{ formattedResults }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import { ExtractionApi, type ExtractDataRequest, type ExtractResponse } from '@/api-client';

/**
 * Inject the API client for extraction operations.
 * The injected object should contain an 'extraction' property of type ExtractionApi.
 * Throws an error if the client or the extraction API is not provided.
 */
const api = inject('api') as { extraction?: ExtractionApi } | undefined;
if (!api || !api.extraction) {
  throw new Error("API client or extraction API is not provided. Make sure the apiPlugin is installed and provides an 'extraction' property.");
}

/**
 * --- State ---
 * urls: URLs in glob format, one per line.
 * extractionPrompt: Prompt for extraction.
 * jsonSchemaString: JSON schema as a string.
 * loading: Loading state for extraction.
 * error: Error message.
 * results: Store extraction results.
 * schemaError: Store JSON schema parsing errors.
 */
const urls = ref(''); // URLs in glob format, one per line
const extractionPrompt = ref(''); // Prompt for extraction
const jsonSchemaString = ref(''); // JSON schema as a string
const loading = ref(false);
const error = ref<string | null>(null);
const results = ref<ExtractResponse['data'] | null>(null); // Store extraction results
const schemaError = ref<string | null>(null); // Store JSON schema parsing errors

// --- Computed Properties ---

/**
 * Computed property to parse the JSON schema string and handle errors.
 * Returns the parsed schema object, undefined if empty, or null if parsing fails.
 */
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

/**
 * Computed property to format results as a pretty JSON string.
 */
const formattedResults = computed(() => {
  return results.value ? JSON.stringify(results.value, null, 2) : '';
});

/**
 * Watch for changes in jsonSchemaString to validate JSON in real-time.
 */
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

/**
 * Handles the extraction form submission.
 * Validates the schema, prepares the request payload, and calls the extraction API.
 * Updates loading, error, and results states accordingly.
 */
const submitExtraction = async () => {
  // Prevent submission if schema is invalid
  if (schemaError.value) {
    error.value = "Please correct the error in the JSON schema before submitting.";
    return;
  }

  loading.value = true;
  error.value = null;
  // Keep previous results visible during loading? Optional: results.value = null;

    // Prepare URL list from textarea input
    const urlList = urls.value.split('\n').map(url => url.trim()).filter(url => url);
    if (urlList.length === 0) {
      error.value = "Please provide at least one URL or glob pattern.";
      loading.value = false;
      return;
    }

    // Construct the request payload according to OpenAPI spec
    const requestPayload: ExtractDataRequest = {
      urls: urlList,
      // Only include extractionOptions if prompt or schema is provided
      ...( (extractionPrompt.value || parsedJsonSchema.value) && {
          extractionOptions: {
            ...(extractionPrompt.value && { prompt: extractionPrompt.value }),
            ...(parsedJsonSchema.value && { schema: parsedJsonSchema.value }),
            // To enable extra options, uncomment and bind to your form:
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
    console.log("Extraction Payload:", JSON.stringify(requestPayload, null, 2));
    // Call the API using the injected client
    const response = await api.extraction!.extractData(requestPayload);

    if (response.data.success && response.data.data) {
      results.value = response.data.data; // Store the successful results
      error.value = null; // Clear any previous error
    } else {
      // Handle cases where API returns success: false or no data
      throw new Error(response.data.error || "Extraction failed without a specific error message.");
    }
  } catch (err: any) {
    // Handle API call errors (network, server errors, etc.)
    const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
    error.value = `Error during extraction: ${errorMessage}`;
    results.value = null; // Clear results on error
    console.error("API Extraction Error:", err.response?.data || err);
  } finally {
    loading.value = false; // Stop loading indicator
  }
};

/**
 * Downloads the extraction results as a JSON file.
 */
const downloadResults = (): void => {
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
