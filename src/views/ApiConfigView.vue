<template>
  <div class="api-config-view">
    <h1>API Configuration</h1>
    <p>A valid API key is required to use Firecrawl.</p>
    <ApiKeyInput />
    <div class="actions">
      <button @click="handleContinue" class="primary">Continue to application</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import ApiKeyInput from '@/components/ApiKeyInput.vue';

/**
 * Component for configuring the API key before using the application.
 *
 * @returns Component options for the API configuration view.
 */
export default defineComponent({
  name: 'ApiConfigView',
  components: {
    ApiKeyInput,
  },
  setup() {
    const router = useRouter();

    /**
     * Handles the continue action, navigating the user to the home page.
     */
    const handleContinue = () => {
      router.push({ name: 'home' });
    };

    return {
      handleContinue,
    };
  },
});
</script>

<style scoped>
.api-config-view {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.actions {
  margin-top: 2rem;
}

/* Primary CTA button — fire gradient matching .primary-button in main.css */
.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-fire);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.primary:hover {
  background: var(--gradient-fire-hover);
  transform: translateY(-2px);
  box-shadow: 0 10px 26px -6px rgba(250, 77, 18, 0.6);
}

.primary:active {
  transform: translateY(0);
}
</style>
