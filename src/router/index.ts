import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ScrapeView from '../views/ScrapeView.vue'
import CrawlView from '../views/CrawlView.vue'
import ApiConfigView from '../views/ApiConfigView.vue'
import ExtractView from '../views/ExtractView.vue' // Import the new view
import MapView from '../components/MapView.vue'
import SearchView from '../components/SearchView.vue'
import MapHistoryView from '../views/MapHistoryView.vue'
import SearchHistoryView from '../views/SearchHistoryView.vue'
import ExtractHistoryView from '../views/ExtractHistoryView.vue'
import CrawlHistoryView from '../views/CrawlHistoryView.vue'
import ScrapeHistoryView from '../views/ScrapeHistoryView.vue'
import AccountView from '../views/AccountView.vue'
import AccountHistoryView from '../views/AccountHistoryView.vue'

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
      path: '/scrape/history',
      name: 'scrapeHistory',
      component: ScrapeHistoryView
    },
    {
      path: '/crawl',
      name: 'crawl',
      component: CrawlView
    },
    {
      path: '/crawl/history',
      name: 'crawlHistory',
      component: CrawlHistoryView
    },
    {
      path: '/api-config',
      name: 'ApiConfig',
      component: ApiConfigView
    },
  {
    path: '/extract',
    name: 'extract',
    component: ExtractView
  },
  {
    path: '/extract/history',
    name: 'extractHistory',
    component: ExtractHistoryView
  },
  {
    path: '/map',
    name: 'map',
    component: MapView
  },
  {
    path: '/map/history',
    name: 'mapHistory',
    component: MapHistoryView
  },
  {
    path: '/search',
    name: 'search',
    component: SearchView
  },
  {
    path: '/search/history',
    name: 'searchHistory',
    component: SearchHistoryView
  },
  {
    path: '/account',
    name: 'account',
    component: AccountView
  },
  {
    path: '/account/history',
    name: 'accountHistory',
    component: AccountHistoryView
  }
  ]
})

export default router
