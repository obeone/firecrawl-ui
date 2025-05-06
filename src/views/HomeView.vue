<template>
  <div class="home">
    <div class="hero">
      <img src="@/assets/logo.svg" alt="Firecrawl Logo" class="logo" />
      <h1>Firecrawl UI</h1>
      <p class="subtitle">
        Plateforme moderne pour le crawling, le scraping et l'analyse de données web.<br>
        Centralisez, explorez et extrayez vos données en toute simplicité.
      </p>
    </div>
    <div class="features">
      <div class="feature-card">
        <IconDocumentation class="icon"/>
        <h2>Scrape</h2>
        <p>Extraire des données structurées de n'importe quelle page web.</p>
        <router-link to="/scrape" class="feature-link">Accéder au Scraping</router-link>
      </div>
      <div class="feature-card">
        <IconEcosystem class="icon"/>
        <h2>Crawl</h2>
        <p>Explorer des sites web en profondeur et collecter des données à grande échelle.</p>
        <router-link to="/crawl" class="feature-link">Accéder au Crawling</router-link>
      </div>
      <div class="feature-card">
        <IconTooling class="icon"/>
        <h2>Extract</h2>
        <p>Extraire le contenu et les métadonnées d'URLs avec des options avancées.</p>
        <router-link to="/extract" class="feature-link">Accéder à l'Extraction</router-link>
      </div>
      <div class="feature-card">
        <IconCommunity class="icon"/>
        <h2>Map</h2>
        <p>Visualiser et cartographier les liens et structures d'un site web.</p>
        <router-link to="/map" class="feature-link">Accéder à la Carte</router-link>
      </div>
      <div class="feature-card">
        <IconSupport class="icon"/>
        <h2>Search</h2>
        <p>Rechercher et filtrer rapidement dans vos résultats de crawl et de scrape.</p>
        <router-link to="/search" class="feature-link">Accéder à la Recherche</router-link>
      </div>
      <div class="feature-card">
        <IconSupport class="icon"/>
        <h2>API Configuration</h2>
        <p>Configurer vos clés API et points d'accès pour des workflows personnalisés.</p>
        <router-link to="/api-config" class="feature-link">Configurer l'API</router-link>
      </div>
    </div>
    <div class="about">
      <h2>À propos de Firecrawl UI</h2>
      <p>
        Firecrawl UI est une interface moderne et intuitive pour l'extraction, le crawling et l'analyse de données web.<br>
        <strong>Fonctionnalités principales :</strong>
      </p>
      <ul>
        <li>Scraping rapide et extraction de contenu structuré.</li>
        <li>Crawling multi-niveaux avec visualisation de la structure du site.</li>
        <li>Recherche avancée dans les résultats collectés.</li>
        <li>Configuration flexible de l'API et gestion des clés.</li>
        <li>Interface cartographique pour explorer les liens entre pages.</li>
      </ul>
      <p>
        <a href="https://github.com/firecrawl/firecrawl-ui" target="_blank" class="about-link">Documentation & Support</a>
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
// Importing icons and components for a modern home page
import IconDocumentation from '@/components/icons/IconDocumentation.vue'
import IconEcosystem from '@/components/icons/IconEcosystem.vue'
import IconTooling from '@/components/icons/IconTooling.vue'
import IconCommunity from '@/components/icons/IconCommunity.vue'
import IconSupport from '@/components/icons/IconSupport.vue'

/**
 * HomeView
 * Main landing page for Firecrawl UI.
 * Presents features, navigation, and project information.
 *
 * @component
 * @example
 * <HomeView />
 */
export default defineComponent({
  name: 'HomeView',
  components: {
    IconDocumentation,
    IconEcosystem,
    IconTooling,
    IconCommunity,
    IconSupport
  }
})
</script>

<style scoped>
/* Palette modernisée */
:root {
  --primary-bg: #f7f8fa;
  --card-bg: #fff;
  --primary: #2563eb;
  --primary-dark: #1e40af;
  --accent: #f59e42;
  --text-main: #1a202c;
  --text-muted: #555;
  --card-shadow: 0 2px 16px rgba(30, 64, 175, 0.07);
}

.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--primary-bg);
  min-height: 100vh;
}

.hero {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo {
  width: 90px;
  height: 90px;
  margin-bottom: 1rem;
}

h1 {
  font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
  font-size: 2.8rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: var(--primary);
  letter-spacing: -1px;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  font-family: 'Inter', Arial, sans-serif;
}

.features {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 2.5rem;
}

.feature-card {
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--card-shadow);
  padding: 2rem 1.5rem 1.5rem 1.5rem;
  width: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: box-shadow 0.2s, transform 0.2s;
  position: relative;
}

.feature-card:hover {
  box-shadow: 0 6px 32px rgba(37, 99, 235, 0.13);
  transform: translateY(-4px) scale(1.03);
}

.icon {
  width: 38px;
  height: 38px;
  margin-bottom: 0.7rem;
  color: var(--primary);
}

.feature-card h2 {
  font-size: 1.18rem;
  margin-bottom: 0.4rem;
  color: var(--text-main);
  font-family: 'Montserrat', Arial, sans-serif;
  font-weight: 700;
}

.feature-card p {
  font-size: 1rem;
  color: var(--text-muted);
  margin-bottom: 1.2rem;
  text-align: center;
  min-height: 48px;
}

.feature-link {
  color: #fff;
  background: var(--primary);
  padding: 0.5rem 1.2rem;
  border-radius: 5px;
  text-decoration: none;
  font-weight: 600;
  font-family: 'Inter', Arial, sans-serif;
  font-size: 1rem;
  margin-top: auto;
  display: block;
  width: 100%;
  text-align: center;
  transition: background 0.2s;
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.08);
}

.feature-link:hover {
  background: var(--primary-dark);
}

.about {
  margin-top: 2.5rem;
  width: 100%;
  background: #fff;
  border-radius: 10px;
  box-shadow: var(--card-shadow);
  padding: 2rem 2.5rem;
  color: var(--text-main);
  font-family: 'Inter', Arial, sans-serif;
}

.about h2 {
  font-size: 1.5rem;
  color: var(--primary);
  margin-bottom: 0.7rem;
  font-family: 'Montserrat', Arial, sans-serif;
  font-weight: 700;
}

.about ul {
  margin: 1rem 0 1.5rem 1.2rem;
  padding: 0;
  color: var(--text-main);
  font-size: 1.05rem;
}

.about-link {
  color: #fff;
  background: var(--accent);
  padding: 0.5rem 1.2rem;
  border-radius: 5px;
  text-decoration: none;
  font-weight: 600;
  font-family: 'Inter', Arial, sans-serif;
  font-size: 1rem;
  transition: background 0.2s;
}

.about-link:hover {
  background: #d97706;
}
</style>
