/**
 * Entry point of the Vue application.
 *
 * This file sets up the Vue app instance, configures global error handling,
 * registers global components, applies plugins, and mounts the app to the DOM.
 */

import './assets/main.css'; // Import global CSS styles
import { createApp } from 'vue';
import App from './App.vue';
import apiPlugin from './plugins/api.js';
import router from './router/index.js';
import ApiKeyInput from './components/ApiKeyInput.vue';

// Create Vue application instance with the root component
const app = createApp(App);

/**
 * Global error handler for the Vue app.
 *
 * Redirects to the API configuration page if a 401 Unauthorized error occurs,
 * and logs all errors to the console.
 *
 * @param {Error} err - The error object caught by Vue.
 * @param {ComponentPublicInstance | null} instance - The Vue component instance where the error occurred.
 * @param {string} info - Additional Vue-specific error information.
 */
app.config.errorHandler = (err, instance, info) => {
  if (err instanceof Error && err.message.includes('401')) {
    // Redirect to API configuration page on 401 Unauthorized errors
    router.push({ name: 'ApiConfig' });
  }
  console.error('Error:', err, info);
};

// Use the API plugin for handling API requests
app.use(apiPlugin);

// Use Vue Router for navigation
app.use(router);

// Register ApiKeyInput component globally for use in any template
app.component('ApiKeyInput', ApiKeyInput);

// Mount the Vue app to the DOM element with id 'app'
app.mount('#app');
