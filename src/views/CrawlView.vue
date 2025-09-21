<template>
  <component :is="activeComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useApiVersion } from '@/stores/apiVersion';
import CrawlViewV1 from './CrawlViewV1.vue';
import CrawlViewV2 from './CrawlViewV2.vue';

/**
 * Wrapper component selecting the crawl view matching the configured API version.
 */
export default defineComponent({
  name: 'CrawlView',
  components: {
    CrawlViewV1,
    CrawlViewV2,
  },
  setup() {
    const apiVersion = useApiVersion();
    const activeComponent = computed(() => (apiVersion.value === 'v2' ? CrawlViewV2 : CrawlViewV1));

    return { activeComponent };
  },
});
</script>
