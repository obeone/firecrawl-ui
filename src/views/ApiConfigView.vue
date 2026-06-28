<template>
  <div class="api-config-view">
    <div class="settings-card glass">
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
        <button type="button" @click="handleContinue" class="primary">
          Continue to application
        </button>
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
/*
 * Outer wrapper: centers the card on the aurora canvas with comfortable
 * vertical breathing room so it reads as floating over the background.
 */
.api-config-view {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 3rem 1rem;
}

/*
 * Settings card: a frosted glass panel floating over the aurora. The .glass
 * utility (base.css) provides backdrop-blur, translucent fill, top-lit
 * hairline border, and depth shadow. We layer a subtle aurora glow from the
 * top edge via ::before to match the page-container pattern in main.css.
 */
.settings-card {
  position: relative;
  width: 100%;
  max-width: 560px;
  border-radius: var(--radius-xl);
  padding: 2.25rem 2.5rem;
  /* Overflow hidden so the aurora glow pseudo-element stays clipped. */
  overflow: hidden;
  transition:
    box-shadow var(--transition),
    transform var(--transition);
}

/* Subtle aurora glow bleeding from the top of the card, same as page-container. */
.settings-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--glow-aurora);
  pointer-events: none;
  z-index: 0;
}

/* Keep card content stacked above the decorative glow layer. */
.settings-card > * {
  position: relative;
  z-index: 1;
}

/* ── Header row ──────────────────────────────────────────────── */

.settings-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  margin-bottom: 1.75rem;
}

/*
 * Icon tile: brand-soft fill with a violet hairline border, matches the
 * tool-icon pattern from HomeView for visual coherence.
 */
.settings-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  color: var(--brand-strong);
  border: 1px solid rgba(124, 92, 255, 0.22);
  /* Smooth transition so hover-light feels intentional, not jarring. */
  transition:
    background var(--transition),
    box-shadow var(--transition);
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

/* ── Actions row ─────────────────────────────────────────────── */

.actions {
  margin-top: 1.75rem;
  text-align: right;
}

/*
 * Primary CTA button: violet→cyan aurora sweep, consistent with
 * .cta-primary in HomeView and .btn-primary in main.css.
 * Hover lifts by 2px and intensifies the violet glow — no more orange.
 */
.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Aurora gradient — violet→cyan sweep (replaces the old fire gradient). */
  background: var(--gradient-violet);
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
  background: var(--gradient-violet-hover);
  transform: translateY(-2px);
  /* Violet neon glow on hover — replaces the old rgba(250, 77, 18) orange. */
  box-shadow: 0 10px 28px -6px rgba(124, 92, 255, 0.6);
}

.primary:active {
  transform: translateY(0);
}
</style>
