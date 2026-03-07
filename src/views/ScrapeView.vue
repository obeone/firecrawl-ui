<template>
  <component :is="currentComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import ScrapeViewV1 from './scrape/ScrapeViewV1.vue';
import ScrapeViewV2 from './scrape/ScrapeViewV2.vue';
import { useApiVersion } from '@/stores/apiVersion.js';

/**
 * Wrapper view selecting the appropriate scraping experience based on the configured API version.
 */
export default defineComponent({
  name: 'ScrapeView',
  components: {
    ScrapeViewV1,
    ScrapeViewV2,
  },
  setup() {
    const { apiVersion } = useApiVersion();

    /**
     * Compute the component that matches the active API version.
     */
    const currentComponent = computed(() =>
      apiVersion.value === 'v2' ? ScrapeViewV2 : ScrapeViewV1,
    );

    return {
      currentComponent,
    };
  },
});
</script>
