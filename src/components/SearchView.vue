<template>
  <component :is="currentComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import SearchViewV1 from './search/SearchViewV1.vue';
import SearchViewV2 from './search/SearchViewV2.vue';
import { useApiVersion } from '@/stores/apiVersion.js';

/**
 * Wrapper component choosing the search workflow according to the API version.
 */
export default defineComponent({
  name: 'SearchView',
  components: {
    SearchViewV1,
    SearchViewV2,
  },
  setup() {
    const { apiVersion } = useApiVersion();
    const currentComponent = computed(() =>
      apiVersion.value === 'v2' ? SearchViewV2 : SearchViewV1,
    );

    return {
      currentComponent,
    };
  },
});
</script>
