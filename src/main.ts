import './assets/main.css'; // Import global CSS
import { createApp } from 'vue';
import App from './App.vue';
import apiPlugin from './plugins/api.js';
import router from './router/index.js';
import ApiKeyInput from './components/ApiKeyInput.vue';

const app = createApp(App);

// Global error handling
app.config.errorHandler = (err, instance, info) => {
  if (err instanceof Error && err.message.includes('401')) {
    // Redirect to API configuration page on 401 errors
    router.push({ name: 'ApiConfig' });
  }
  console.error('Error:', err, info);
};

app.use(apiPlugin);
app.use(router);

// Register the component globally
app.component('ApiKeyInput', ApiKeyInput);

app.mount('#app');
