<template>
  <v-app>
    <v-app-bar flat color="background" density="comfortable" class="app-bar">
      <v-container class="d-flex align-center" max-width="960">
        <router-link to="/" class="brand-link">
          <v-icon icon="mdi-quiz-outline" color="primary" class="mr-2" />
          <span class="brand">{{ quizName }}</span>
        </router-link>
        <v-spacer />
        <router-link to="/contact" class="nav-link">
          <v-icon icon="mdi-email-outline" size="16" class="mr-1" />
          Contact
        </router-link>
        <router-link v-if="auth.isCurrentDomainAllowed" to="/admin" class="nav-link ml-4">
          <v-icon icon="mdi-shield-account-outline" size="16" class="mr-1" />
          Administration
        </router-link>
      </v-container>
    </v-app-bar>

    <v-main class="background">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
// Le lien vers la partie admin n'est affiché que si le domaine consulté
// fait partie de la liste configurée dans l'onglet admin "Identifiants"
// (par défaut : localhost / 127.0.0.1). L'URL /admin reste toujours
// accessible directement et protégée par le login, quel que soit le domaine.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useQuizBannersStore } from '@/stores/quizBanners'

const auth = useAuthStore()

// Le nom affiché en haut à gauche est le nom du quizz en cours (titre de la
// bannière de quizz active définie en admin), avec un repli générique s'il
// n'y en a pas.
const quizBanners = useQuizBannersStore()
const quizName = computed(() => quizBanners.active?.title || 'Quizz')
</script>

<style>
html, body {
  font-family: 'Inter', sans-serif;
}

.app-bar {
  border-bottom: 1px solid rgba(34, 49, 79, 0.1);
}

.brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.brand {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
  font-size: 1.4rem;
  letter-spacing: 0.01em;
}

.nav-link {
  font-size: 0.78rem;
  color: #8a8d97;
  text-decoration: none;
  display: flex;
  align-items: center;
}

.nav-link:hover {
  color: rgb(var(--v-theme-primary));
}
</style>
