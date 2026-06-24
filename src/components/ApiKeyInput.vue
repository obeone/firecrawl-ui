<template>
  <div class="api-key-input">
    <h2>API Configuration</h2>
    <form @submit.prevent="saveApiConfig">
      <div class="form-group">
        <label for="apiKey">Firecrawl API Key:</label>
        <input
          id="apiKey"
          v-model="apiKey"
          type="password"
          placeholder="Enter your API key"
          required
        />
        <small>
          You can get your API key on
          <a href="https://app.firecrawl.dev" target="_blank">the Firecrawl dashboard</a>
        </small>
      </div>
      <div class="form-group">
        <label for="baseUrl">Firecrawl API base URL (optional):</label>
        <input id="baseUrl" v-model="baseUrl" type="text" placeholder="https://api.firecrawl.dev" />
        <small> Leave blank to use the default URL. </small>
      </div>
      <button type="submit" class="primary-button">Save</button>
    </form>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="success" class="success-message">API Key saved successfully!</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { refreshApiClients } from '@/plugins/api';
import { normalizeFirecrawlBaseUrl } from '@/services/firecrawl';

/**
 * Component allowing users to configure and store the Firecrawl API key and base URL.
 * This component handles the persistence of these settings in local storage.
 *
 * @returns Component options for the API key input view.
 */

export default defineComponent({
  name: 'ApiKeyInput',
  setup() {
    const apiKey = ref(localStorage.getItem('firecrawl_api_key') || '');
    const baseUrl = ref(localStorage.getItem('firecrawl_base_url') || '');
    const error = ref('');
    const success = ref(false);

    // Automatically display if no key is configured
    onMounted(() => {
      if (!apiKey.value) {
        error.value = 'Please configure your API key to continue';
      }
      if (baseUrl.value) {
        baseUrl.value = normalizeFirecrawlBaseUrl(baseUrl.value);
      }
    });

    const saveApiConfig = () => {
      try {
        if (!apiKey.value) {
          throw new Error('Please enter a valid API key');
        }
        // Save the API key
        localStorage.setItem('firecrawl_api_key', apiKey.value);
        // Save the base URL (even if empty to override any previous value if needed)
        localStorage.setItem('firecrawl_base_url', normalizeFirecrawlBaseUrl(baseUrl.value));

        success.value = true;
        error.value = '';
        setTimeout(() => (success.value = false), 3000);

        // Update API clients dynamically without reloading the page
        refreshApiClients(baseUrl.value, apiKey.value);
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Unknown error';
        success.value = false;
      }
    };

    return {
      apiKey,
      baseUrl,
      error,
      success,
      saveApiConfig,
    };
  },
});
</script>

<style scoped>
/* ---------------------------------------------------------------------------
 * ApiKeyInput — small reusable glass settings card.
 *
 * Subtle, not flashy: a frosted-glass panel, glassy inputs with violet focus
 * halo, and a violet→cyan aurora gradient Save button. Replaces the old fire
 * gradient and hardcoded orange rgba glow with cool palette tokens.
 * ------------------------------------------------------------------------- */

/* Frosted glass panel — sits coherently over the aurora. */
.api-key-input {
  max-width: 500px;
  margin: 0 auto;
  padding: 1.5rem;
  /* Glass surface: translucent fill + heavy backdrop blur. */
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
}

.form-group {
  margin-bottom: 1rem;
}

/* Field labels — consistent weight with other form components. */
label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-soft);
}

/* Inputs inherit global glassy input styles; override width + focus here. */
input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  /* Semi-transparent so the aurora subtly tints the fields. */
  background: var(--color-background-soft);
  color: var(--color-text);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

/* Focus: violet border + soft violet halo ring (cool, not orange). */
input:focus {
  outline: none;
  border-color: var(--violet-500);
  box-shadow: var(--shadow-ring);
}

/* The Save button is a primary action — violet→cyan aurora gradient.
   Replaces the old fire gradient; glow is cool violet, not orange. */
button {
  background: var(--gradient-violet);
  color: #fff;
  padding: 0.6rem 1.1rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

button:hover {
  background: var(--gradient-violet-hover);
  transform: translateY(-2px);
  /* Cool violet glow on hover instead of the old orange. */
  box-shadow: 0 10px 26px -6px rgba(124, 92, 255, 0.6);
}

button:active {
  transform: translateY(0);
}

/* Inline feedback messages — semantic danger / success tokens. */
.error-message {
  color: var(--hue-danger);
  font-size: 0.88rem;
  margin-top: 0.75rem;
}

.success-message {
  color: var(--hue-success);
  font-size: 0.88rem;
  margin-top: 0.75rem;
}

/* Helper text under fields. */
small {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.8em;
  color: var(--color-text-mute);
}
</style>
