<script setup lang="ts">
/**
 * CodeBlock.vue
 *
 * Monospace, scrollable output pane used by playground response tabs to show
 * raw text or pretty-printed JSON. Renders a slim header (optional label +
 * copy button) above a scrolling `<pre>`.
 */
import { computed } from 'vue';
import CopyButton from './CopyButton.vue';

const props = defineProps<{
  /** Plain string content. Ignored when `json` is provided. */
  content?: string;
  /** Any value to be pretty-printed as JSON. Takes precedence over `content`. */
  json?: unknown;
  /** Optional header label (e.g. "JSON", "Markdown"). */
  label?: string;
  /** Hide the copy button when true. */
  hideCopy?: boolean;
}>();

/**
 * The resolved text to display: pretty JSON when `json` is set, otherwise the
 * raw `content` string.
 */
const text = computed<string>(() => {
  if (props.json !== undefined) {
    try {
      return JSON.stringify(props.json, null, 2);
    } catch {
      return String(props.json);
    }
  }
  return props.content ?? '';
});
</script>

<template>
  <div class="code-block">
    <div v-if="label || !hideCopy" class="code-head">
      <span class="code-label">{{ label }}</span>
      <CopyButton v-if="!hideCopy" :text="text" />
    </div>
    <pre class="code-body"><code>{{ text }}</code></pre>
  </div>
</template>

<style scoped>
.code-block {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.code-label {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-mute);
}

.code-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin: 0;
  padding: 1rem;
  font-family: var(--font-mono);
  font-size: 0.84rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-background);
  white-space: pre;
  tab-size: 2;
}

.code-body code {
  font-family: inherit;
}
</style>
