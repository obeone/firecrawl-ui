<template>
  <!-- Upstream deprecation of a legacy v1 tool; the tool itself keeps working. -->
  <aside v-if="entry" class="deprecation-notice" aria-label="Deprecation notice">
    <p>
      <strong>Deprecated v1 endpoint.</strong>
      Firecrawl removes it from its cloud API on {{ removal }}. It keeps working on self-hosted
      installs that still serve it. Firecrawl recommends {{ entry.replacement }} instead; see the
      <a :href="entry.migrationGuide" target="_blank" rel="noopener noreferrer">migration guide</a>.
    </p>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { deprecationFor, formatRemovalDate } from '@/config/deprecations';

const props = defineProps<{
  /** Router path of the tool, e.g. `/research`. */
  path: string;
}>();

const entry = computed(() => deprecationFor(props.path));
const removal = computed(() => (entry.value ? formatRemovalDate(entry.value.removal) : ''));
</script>

<style scoped>
.deprecation-notice {
  margin: 0 0 1.25rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-left: 3px solid #d9a441;
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  font-size: 0.9rem;
}

.deprecation-notice p {
  margin: 0;
}

.deprecation-notice a {
  text-decoration: underline;
}
</style>
