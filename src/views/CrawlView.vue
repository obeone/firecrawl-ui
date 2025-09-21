<template>
  <component :is="currentComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import CrawlViewV1 from './crawl/CrawlViewV1.vue';
import CrawlViewV2 from './crawl/CrawlViewV2.vue';
import { useApiVersion } from '@/stores/apiVersion.js';

/**
 * Wrapper view delegating to the crawl implementation matching the active API version.
 */
export default defineComponent({
  name: 'CrawlView',
  components: {
    CrawlViewV1,
    CrawlViewV2,
  },
  setup() {
    const { apiVersion } = useApiVersion();
    const currentComponent = computed(() =>
      apiVersion.value === 'v2' ? CrawlViewV2 : CrawlViewV1,
    );

    return {
      currentComponent,
    };
  },
});
</script>
