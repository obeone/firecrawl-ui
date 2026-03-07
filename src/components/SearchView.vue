<template>
  <component :is="activeComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useApiVersion } from '@/stores/apiVersion';
import SearchViewV1 from './SearchViewV1.vue';
import SearchViewV2 from './SearchViewV2.vue';

/**
 * Wrapper component selecting the appropriate search view based on API version.
 */
export default defineComponent({
  name: 'SearchView',
  components: {
    SearchViewV1,
    SearchViewV2,
  },
  setup() {
    const apiVersion = useApiVersion();
    const activeComponent = computed(() =>
      apiVersion.value === 'v2' ? SearchViewV2 : SearchViewV1,
    );

    return { activeComponent };
  },
});
</script>
