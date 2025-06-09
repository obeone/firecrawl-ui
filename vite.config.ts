import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * Vite configuration file.
 * Defines how the Vite development server and build process should behave.
 *
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [
    // Vue plugin for Vite, enabling Vue 3 SFC support.
    vue(),
  ],
  resolve: {
    /**
     * Path aliases for easier imports.
     * Allows using '@' to refer to the 'src' directory.
     * Example: import MyComponent from '@/components/MyComponent.vue';
     */
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
