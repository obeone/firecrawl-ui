<script setup lang="ts">
/**
 * CopyButton.vue
 *
 * Small icon button that copies a given string to the clipboard and briefly
 * confirms the action with a checkmark. Used in playground response panels to
 * copy raw output, JSON, links, etc.
 */
import { ref } from 'vue';

const props = defineProps<{
  /** The text payload copied to the clipboard when the button is clicked. */
  text: string;
  /** Optional accessible label / tooltip (defaults to "Copy"). */
  label?: string;
}>();

/** Whether the "copied" confirmation state is currently shown. */
const copied = ref(false);

/** Timer handle used to reset the confirmation state. */
let resetTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Copies the current `text` prop to the clipboard and toggles the confirmation
 * state for a short window. Falls back silently if the Clipboard API is absent.
 */
async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.text ?? '');
    copied.value = true;
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      copied.value = false;
    }, 1400);
  } catch {
    // Clipboard unavailable (insecure context / denied) — fail quietly.
  }
}
</script>

<template>
  <button
    type="button"
    class="copy-btn"
    :class="{ 'is-copied': copied }"
    :aria-label="label ?? 'Copy'"
    :title="label ?? 'Copy'"
    @click.stop="copy"
  >
    <svg v-if="!copied" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
    <svg v-else viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path d="m20 6-11 11-5-5" />
    </svg>
    <span class="copy-label">{{ copied ? 'Copied' : (label ?? 'Copy') }}</span>
  </button>
</template>

<style scoped>
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-soft);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.3rem 0.55rem;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.copy-btn svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.copy-btn:hover {
  color: var(--color-heading);
  border-color: var(--color-border-hover);
}

.copy-btn.is-copied {
  color: var(--hue-success);
  border-color: var(--hue-success);
  background: var(--hue-success-soft);
}

.copy-label {
  line-height: 1;
}
</style>
