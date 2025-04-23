<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar">
      <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="80" height="80" />
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/scrape">Scrape</RouterLink>
        <RouterLink to="/crawl">Crawl</RouterLink>
        <RouterLink to="/api-config">API Config</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style>
/* Supprime les anciens styles globaux non nécessaires */
#app {
  /* Conserve les polices et l'antialiasing si nécessaire, mais la structure est gérée par app-layout */
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align et margin-top sont supprimés car gérés par la nouvelle layout */
  /* color est hérité ou défini dans base.css */
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px; /* Largeur fixe pour la sidebar */
  background-color: var(--color-background-soft); /* Couleur de fond légèrement différente */
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border); /* Ajoute une bordure fine */
}

.sidebar .logo {
  display: block;
  margin: 0 auto 2rem; /* Centre le logo et ajoute de l'espace en dessous */
  width: 80px; /* Taille ajustée */
  height: 80px;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem; /* Espace entre les liens */
}

.sidebar nav a {
  display: block; /* Pour que le padding et le background s'appliquent correctement */
  padding: 0.6rem 1rem;
  border-radius: 6px; /* Coins arrondis */
  color: var(--color-text); /* Utilise la variable CSS pour la couleur du texte */
  text-decoration: none;
  font-weight: 500; /* Un peu moins gras que 'bold' */
  transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
}

.sidebar nav a:hover {
  background-color: var(--color-background-mute); /* Léger fond au survol */
}

.sidebar nav a.router-link-exact-active {
  background-color: hsla(160, 100%, 37%, 0.2); /* Utilise la couleur d'accentuation existante mais en fond */
  color: hsla(160, 100%, 37%, 1); /* Couleur d'accentuation pour le texte */
  font-weight: 600; /* Un peu plus prononcé pour l'actif */
}

main {
  flex-grow: 1; /* Prend tout l'espace restant */
  padding: 2rem; /* Marge intérieure pour le contenu */
  overflow-y: auto; /* Ajoute une barre de défilement si le contenu dépasse */
  background-color: var(--color-background); /* Fond principal */
}

/* Supprime les styles @media spécifiques à l'ancien header */
/* @media (min-width: 1024px) { ... } */

</style>
