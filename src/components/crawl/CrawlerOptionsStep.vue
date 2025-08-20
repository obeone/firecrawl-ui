<template>
  <fieldset class="form-group options-fieldset">
    <legend>Crawler Options</legend>
    <div class="grid-layout">
      <div class="form-group">
        <label for="includes">Includes (Regex Patterns):</label>
        <input
          id="includes"
          v-model="includesInput"
          type="text"
          placeholder="/blog/.*, /products/.*"
          @blur="parseIncludes"
        />
        <div v-if="includesError" class="error-message">{{ includesError }}</div>
      </div>
      <div class="form-group">
        <label for="excludes">Excludes (Regex Patterns):</label>
        <input
          id="excludes"
          v-model="excludesInput"
          type="text"
          placeholder="/login, /private/.*"
          @blur="parseExcludes"
        />
        <div v-if="excludesError" class="error-message">{{ excludesError }}</div>
      </div>
      <div class="form-group">
        <label for="maxDepth">Max Depth:</label>
        <input
          id="maxDepth"
          v-model.number="localData.crawlerOptions.maxDepth"
          type="number"
          min="1"
        />
      </div>
      <div class="form-group">
        <label for="maxDiscoveryDepth">Max Discovery Depth:</label>
        <input
          id="maxDiscoveryDepth"
          v-model.number="localData.crawlerOptions.maxDiscoveryDepth"
          type="number"
          min="1"
        />
      </div>
      <div class="form-group">
        <label for="limit">Page Limit:</label>
        <input id="limit" v-model.number="localData.crawlerOptions.limit" type="number" min="1" />
      </div>
      <div class="form-group">
        <label for="delay">Delay (seconds):</label>
        <input
          id="delay"
          v-model.number="localData.crawlerOptions.delay"
          type="number"
          min="0"
          step="0.1"
        />
      </div>
    </div>
    <div class="grid-layout">
      <label class="checkbox-label">
        <input type="checkbox" v-model="localData.crawlerOptions.ignoreSitemap" />
        Ignore Sitemap
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="localData.crawlerOptions.ignoreQueryParameters" />
        Ignore Query Parameters
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="localData.crawlerOptions.allowExternalLinks" />
        Allow External Links
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="localData.crawlerOptions.navigateBacklinks" />
        Navigate Backlinks
      </label>
    </div>
  </fieldset>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, toRefs, onMounted } from 'vue';
import type { CrawlFormData } from '@/types/crawl';

/**
 * Step component for configuring crawler options.
 */
export default defineComponent({
  name: 'CrawlerOptionsStep',
  props: {
    formData: {
      type: Object as PropType<CrawlFormData>,
      required: true,
    },
  },
  setup(props) {
    const { formData: localData } = toRefs(props);
    const includesInput = ref('');
    const excludesInput = ref('');
    const includesError = ref('');
    const excludesError = ref('');

    onMounted(() => {
      includesInput.value = (localData.value.crawlerOptions.includes || []).join(', ');
      excludesInput.value = (localData.value.crawlerOptions.excludes || []).join(', ');
    });

    /**
     * Parse comma-separated includes patterns and update form data.
     */
    const parseIncludes = (): void => {
      const patterns = includesInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const pattern of patterns) {
        try {
          new RegExp(pattern);
        } catch (e: any) {
          includesError.value = `Invalid regex pattern: ${pattern}`;
          return;
        }
      }
      includesError.value = '';
      localData.value.crawlerOptions.includes = patterns;
    };

    /**
     * Parse comma-separated excludes patterns and update form data.
     */
    const parseExcludes = (): void => {
      const patterns = excludesInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const pattern of patterns) {
        try {
          new RegExp(pattern);
        } catch (e: any) {
          excludesError.value = `Invalid regex pattern: ${pattern}`;
          return;
        }
      }
      excludesError.value = '';
      localData.value.crawlerOptions.excludes = patterns;
    };

    return {
      localData,
      includesInput,
      excludesInput,
      includesError,
      excludesError,
      parseIncludes,
      parseExcludes,
    };
  },
});
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.error-message {
  color: #cc0000;
  font-size: 0.875rem;
}
</style>
