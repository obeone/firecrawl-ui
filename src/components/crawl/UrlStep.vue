<template>
  <div class="form-group">
    <label for="url">Base URL to Crawl:</label>
    <input
      id="url"
      v-model="localData.url"
      type="text"
      required
      placeholder="https://example.com"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, toRefs } from 'vue';
import type { CrawlFormData } from '@/types/crawl';

/**
 * Step component for configuring the base URL.
 */
export default defineComponent({
  name: 'UrlStep',
  props: {
    formData: {
      type: Object as PropType<CrawlFormData>,
      required: true,
    },
  },
  setup(props) {
    const { formData: localData } = toRefs(props);
    return { localData };
  },
});
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}
</style>
