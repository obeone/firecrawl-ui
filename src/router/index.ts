import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ScrapeView from '../views/ScrapeView.vue';
import CrawlView from '../views/CrawlView.vue';
import ApiConfigView from '../views/ApiConfigView.vue';
import ExtractView from '../views/ExtractView.vue'; // Import the new view
import MapView from '../components/MapView.vue';
import SearchView from '../components/SearchView.vue';
import AboutView from '../views/AboutView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView, // Route for the application's home page.
    },
    {
      path: '/scrape',
      name: 'scrape',
      component: ScrapeView, // Route for the web scraping functionality.
    },
    {
      path: '/crawl',
      name: 'crawl',
      component: CrawlView, // Route for the web crawling functionality.
    },
    {
      path: '/api-config',
      name: 'api-config', // Route for API configuration settings.
      component: ApiConfigView,
    },
    {
      path: '/extract',
      name: 'extract',
      component: ExtractView, // Route for the data extraction view.
    },
    {
      path: '/map',
      name: 'map',
      component: MapView, // Route for displaying the map view.
    },
    {
      path: '/search',
      name: 'search',
      component: SearchView, // Route for the search functionality view.
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView, // Route for the about page.
    },
  ],
});

export default router;
