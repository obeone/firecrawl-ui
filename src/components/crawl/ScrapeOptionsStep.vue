<template>
  <fieldset class="form-group options-fieldset">
    <legend>Scrape Options</legend>
    <div class="form-group">
      <label for="formats">Output Formats:</label>
      <select id="formats" v-model="localData.scrapeOptions.formats" multiple>
        <option value="markdown">Markdown</option>
        <option value="html">HTML</option>
        <option value="rawHtml">Raw HTML</option>
        <option value="links">Links</option>
        <option value="screenshot">Screenshot (Viewport)</option>
        <option value="screenshot@fullPage">Screenshot (Full Page)</option>
        <option value="json">JSON</option>
        <option value="changeTracking">Change Tracking</option>
      </select>
    </div>
    <label class="checkbox-label">
      <input type="checkbox" v-model="localData.scrapeOptions.onlyMainContent" />
      Only Main Content
    </label>
    <div class="form-group">
      <label for="includeTags">Include Tags (CSS Selectors):</label>
      <input
        id="includeTags"
        v-model="includeTagsInput"
        type="text"
        placeholder="article, .main-content"
        @blur="parseIncludeTags"
      />
    </div>
    <div class="form-group">
      <label for="excludeTags">Exclude Tags (CSS Selectors):</label>
      <input
        id="excludeTags"
        v-model="excludeTagsInput"
        type="text"
        placeholder="nav, footer"
        @blur="parseExcludeTags"
      />
    </div>
  </fieldset>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, toRefs, onMounted } from 'vue';
import type { CrawlFormData } from '@/types/crawl';

/**
 * Step component for configuring scrape options.
 */
export default defineComponent({
  name: 'ScrapeOptionsStep',
  props: {
    formData: {
      type: Object as PropType<CrawlFormData>,
      required: true,
    },
  },
  setup(props) {
    const { formData: localData } = toRefs(props);
    const includeTagsInput = ref('');
    const excludeTagsInput = ref('');

    onMounted(() => {
      includeTagsInput.value = (localData.value.scrapeOptions.includeTags || []).join(', ');
      excludeTagsInput.value = (localData.value.scrapeOptions.excludeTags || []).join(', ');
    });

    /**
     * Parse comma-separated include tags and update form data.
     */
    const parseIncludeTags = (): void => {
      localData.value.scrapeOptions.includeTags = includeTagsInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    /**
     * Parse comma-separated exclude tags and update form data.
     */
    const parseExcludeTags = (): void => {
      localData.value.scrapeOptions.excludeTags = excludeTagsInput.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    return {
      localData,
      includeTagsInput,
      excludeTagsInput,
      parseIncludeTags,
      parseExcludeTags,
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
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
</style>
