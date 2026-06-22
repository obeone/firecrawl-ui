<template>
  <div class="api-config-view">
    <div class="settings-card">
      <div class="settings-head">
        <span class="settings-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            />
          </svg>
        </span>
        <div>
          <h1>API Configuration</h1>
          <p class="settings-sub">A valid API key is required to use Firecrawl.</p>
        </div>
      </div>
      <ApiKeyInput />
      <div class="actions">
        <button @click="handleContinue" class="primary">Continue to application</button>
      </div>
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
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
}

/* Centered settings panel matching the playground surfaces. */
.settings-card {
  width: 100%;
  max-width: 560px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--box-shadow-container);
  padding: 2rem;
}

.settings-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  margin-bottom: 1.5rem;
}

.settings-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.settings-icon svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.settings-head h1 {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.settings-sub {
  color: var(--color-text-soft);
  font-size: 0.92rem;
  margin-top: 0.15rem;
}

.actions {
  margin-top: 1.75rem;
  text-align: right;
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
