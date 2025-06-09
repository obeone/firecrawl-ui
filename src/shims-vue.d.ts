/**
 * TypeScript declaration file for Vue single-file components (*.vue).
 *
 * This module declaration allows TypeScript to recognize imports of .vue files
 * as Vue components with proper typing, enabling type checking and IntelliSense
 * support in Vue 3 projects using TypeScript.
 */

declare module '*.vue' {
  import { DefineComponent } from 'vue';

  /**
   * Represents a Vue component with any props, emits, and slots.
   */
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
