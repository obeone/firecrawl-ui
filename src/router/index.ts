import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ScrapeView from '../views/ScrapeView.vue'
import CrawlView from '../views/CrawlView.vue'
import ApiConfigView from '../views/ApiConfigView.vue'

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
    }
  ]
})

export default router
