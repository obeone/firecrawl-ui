import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ScrapeView from '../views/ScrapeView.vue'
import CrawlView from '../views/CrawlView.vue'
import ApiConfigView from '../views/ApiConfigView.vue'
import ExtractView from '../views/ExtractView.vue' // Import the new view
import MapView from '../components/MapView.vue'
import SearchView from '../components/SearchView.vue' // Import SearchView component

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/scrape',
      name: 'scrape',
      component: ScrapeView
    },
    {
      path: '/crawl',
      name: 'crawl',
      component: CrawlView
    },
    {
      path: '/api-config',
      name: 'ApiConfig',
      component: ApiConfigView
    },
    { // Add the route for ExtractView
      path: '/extract',
      name: 'extract',
      component: ExtractView
    },
    {
      path: '/map',
      name: 'map',
      component: MapView
    },
    { // Add the route for SearchView
      path: '/searchview',
      name: 'searchview',
      component: SearchView
    }
  ]
})

export default router
