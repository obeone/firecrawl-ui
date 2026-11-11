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
          autocomplete="off"
          :placeholder="keyRequired ? 'Enter your API key' : 'Optional for this instance'"
          :required="keyRequired"
        />
        <small>
          Required for Firecrawl Cloud; get one on
          <a href="https://app.firecrawl.dev" target="_blank" rel="noopener noreferrer"
            >the Firecrawl dashboard</a
          >. A self-hosted instance without authentication needs none. The key is stored in this
          browser's local storage.
        </small>
      </div>
      <div class="form-group">
        <label for="baseUrl">Firecrawl API base URL (optional):</label>
        <input id="baseUrl" v-model="baseUrl" type="text" placeholder="https://api.firecrawl.dev" />
        <small> Leave blank to use the default URL. </small>
      </div>
      <div class="actions">
        <button type="submit" class="primary-button">Save</button>
        <button type="button" class="secondary-button" :disabled="testing" @click="checkConnection">
          {{ testing ? 'Testing…' : 'Test connection' }}
        </button>
        <button type="button" class="secondary-button" :disabled="!hasSavedKey" @click="forgetKey">
          Forget key
        </button>
      </div>
    </form>
    <div v-if="connection" :class="connection.ok ? 'success-message' : 'error-message'">
      {{ connection.message }}
    </div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="success" class="success-message">{{ success }}</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, onMounted } from 'vue';
import { forgetSavedApiKey, refreshApiClients } from '@/plugins/api';
import { getBuildTimeApiKey, resolveBaseUrl } from '@/config/api';
import { normalizeFirecrawlBaseUrl } from '@/services/firecrawl';
import { isApiKeyMissing, testConnection, type ConnectionTestResult } from '@/utils/connection';

/**
 * Component allowing users to configure and store the Firecrawl API key and base URL.
 * This component handles the persistence of these settings in local storage.
 *
 * A key is only required for Firecrawl Cloud; a self-hosted instance may run
 * without authentication.
 *
 * @returns Component options for the API key input view.
 */

export default defineComponent({
  name: 'ApiKeyInput',
  setup() {
    const apiKey = ref(localStorage.getItem('firecrawl_api_key') || '');
    const baseUrl = ref(localStorage.getItem('firecrawl_base_url') || '');
    const hasSavedKey = ref(Boolean(apiKey.value));
    const error = ref('');
    const success = ref('');
    const testing = ref(false);
    const connection = ref<ConnectionTestResult | null>(null);

    /** Key typed in the form, else the one baked in at build time. */
    const effectiveKey = () => apiKey.value.trim() || getBuildTimeApiKey();
    /** Base URL typed in the form, else the build-time one, else Firecrawl Cloud. */
    const effectiveBaseUrl = () => resolveBaseUrl(baseUrl.value);
    const keyRequired = computed(() => isApiKeyMissing(effectiveBaseUrl(), getBuildTimeApiKey()));

    // Ask for a key on load only when the target actually needs one.
    onMounted(() => {
      if (isApiKeyMissing(effectiveBaseUrl(), effectiveKey())) {
        error.value = 'Please configure your API key to use Firecrawl Cloud';
      }
      if (baseUrl.value) {
        baseUrl.value = normalizeFirecrawlBaseUrl(baseUrl.value);
      }
    });

    const flash = (message: string) => {
      success.value = message;
      setTimeout(() => (success.value = ''), 3000);
    };

    const saveApiConfig = () => {
      try {
        if (isApiKeyMissing(effectiveBaseUrl(), effectiveKey())) {
          throw new Error('Firecrawl Cloud requires an API key');
        }
        error.value = '';
        // Update the saved settings and the API clients without reloading the page.
        // An empty key removes the saved one.
        refreshApiClients(
          baseUrl.value.trim() ? normalizeFirecrawlBaseUrl(baseUrl.value) : '',
          apiKey.value,
        );
        hasSavedKey.value = Boolean(apiKey.value.trim());
        flash('Settings saved.');
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Unknown error';
        success.value = '';
      }
    };

    const checkConnection = async () => {
      testing.value = true;
      connection.value = null;
      try {
        connection.value = await testConnection(effectiveBaseUrl(), effectiveKey());
      } finally {
        testing.value = false;
      }
    };

    const forgetKey = () => {
      const buildTimeKeyRemains = forgetSavedApiKey();
      apiKey.value = '';
      hasSavedKey.value = false;
      error.value = '';
      flash(
        buildTimeKeyRemains
          ? 'Saved key removed. The key built into this deployment is still in use.'
          : 'Saved key removed.',
      );
    };

    return {
      apiKey,
      baseUrl,
      error,
      success,
      testing,
      connection,
      hasSavedKey,
      keyRequired,
      saveApiConfig,
      checkConnection,
      forgetKey,
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

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

/* Secondary actions: outlined, so Save stays the primary call to action. */
.secondary-button {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  box-shadow: none;
}

.secondary-button:hover:not(:disabled) {
  background: var(--color-background-soft);
  box-shadow: none;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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
