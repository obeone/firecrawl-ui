<template>
  <div class="page-container">
    <h1>Crawl Configuration</h1>
    <div class="stepper">
      <button
        v-for="(step, index) in steps"
        :key="step"
        class="step-button"
        :class="{ active: currentStep === index }"
        @click="currentStep = index"
      >
        {{ step }}
      </button>
    </div>
    <form class="scrape-config-form" @submit.prevent="handleSubmit">
      <UrlStep v-if="currentStep === 0" :formData="formData" />
      <CrawlerOptionsStep v-if="currentStep === 1" :formData="formData" />
      <ScrapeOptionsStep v-if="currentStep === 2" :formData="formData" />
      <div class="navigation-buttons">
        <button type="button" @click="prevStep" :disabled="currentStep === 0">Back</button>
        <button v-if="currentStep < steps.length - 1" type="button" @click="nextStep">Next</button>
        <button v-else type="submit">Submit</button>
      </div>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="submitted" class="success-message">Crawl submitted successfully.</div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, inject } from 'vue';
import UrlStep from '@/components/crawl/UrlStep.vue';
import CrawlerOptionsStep from '@/components/crawl/CrawlerOptionsStep.vue';
import ScrapeOptionsStep from '@/components/crawl/ScrapeOptionsStep.vue';
import type { CrawlFormData } from '@/types/crawl';
import { type CrawlingApi } from '@/api-client/api';

/**
 * View guiding the user through crawl configuration steps.
 */
export default defineComponent({
  name: 'CrawlView',
  components: { UrlStep, CrawlerOptionsStep, ScrapeOptionsStep },
  setup() {
    const api = inject('api') as { crawling: CrawlingApi } | undefined;

    const formData = ref<CrawlFormData>({
      url: '',
      crawlerOptions: {},
      scrapeOptions: { formats: [] },
    });

    const steps = ['URL', 'Crawler Options', 'Scrape Options'];
    const currentStep = ref(0);
    const error = ref('');
    const submitted = ref(false);

    /**
     * Move to the next step if possible.
     */
    const nextStep = (): void => {
      if (currentStep.value < steps.length - 1) {
        currentStep.value += 1;
      }
    };

    /**
     * Return to the previous step if possible.
     */
    const prevStep = (): void => {
      if (currentStep.value > 0) {
        currentStep.value -= 1;
      }
    };

    /**
     * Validate the provided URL string.
     */
    const isValidUrl = (value: string): boolean => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    };

    /**
     * Submit the crawl configuration to the backend API.
     */
    const handleSubmit = async (): Promise<void> => {
      error.value = '';
      submitted.value = false;
      if (!isValidUrl(formData.value.url)) {
        error.value = 'Please enter a valid URL (e.g. https://example.com)';
        return;
      }
      if (!formData.value.scrapeOptions.formats.length) {
        error.value = 'Please select at least one output format';
        return;
      }
      try {
        if (api) {
          await api.crawling.crawlUrls({
            url: formData.value.url,
            includePaths: formData.value.crawlerOptions.includes,
            excludePaths: formData.value.crawlerOptions.excludes,
            maxDepth: formData.value.crawlerOptions.maxDepth,
            maxDiscoveryDepth: formData.value.crawlerOptions.maxDiscoveryDepth,
            limit: formData.value.crawlerOptions.limit,
            delay: formData.value.crawlerOptions.delay,
            ignoreSitemap: formData.value.crawlerOptions.ignoreSitemap,
            ignoreQueryParameters: formData.value.crawlerOptions.ignoreQueryParameters,
            allowExternalLinks: formData.value.crawlerOptions.allowExternalLinks,
            allowBackwardLinks: formData.value.crawlerOptions.navigateBacklinks,
            scrapeOptions: {
              formats: formData.value.scrapeOptions.formats,
              onlyMainContent: formData.value.scrapeOptions.onlyMainContent,
              includeTags: formData.value.scrapeOptions.includeTags,
              excludeTags: formData.value.scrapeOptions.excludeTags,
            },
          });
          submitted.value = true;
        }
      } catch (e: any) {
        error.value = e.message;
      }
    };

    return {
      formData,
      steps,
      currentStep,
      nextStep,
      prevStep,
      handleSubmit,
      error,
      submitted,
    };
  },
});
</script>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
.stepper {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.step-button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  background: #f5f5f5;
  cursor: pointer;
}
.step-button.active {
  background: #2563eb;
  color: #fff;
}
.navigation-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.error-message {
  margin-top: 1rem;
  color: #cc0000;
}
.success-message {
  margin-top: 1rem;
  color: #008000;
}
</style>
