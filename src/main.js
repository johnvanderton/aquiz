import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vuetify from './plugins/vuetify'
import router from './router'
import App from './App.vue'
import { api, setUnauthorizedHandler } from './utils/api'
import { useLibraryStore } from './stores/library'
import { useVendorsStore } from './stores/vendors'
import { useQuizBannersStore } from './stores/quizBanners'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

// Toute la persistance vit sur le serveur (base SQLite). Avant d'afficher
// l'application, on charge la configuration publique (quiz publié, bannières,
// seuils, domaines autorisés) et l'état de la session admin.
async function bootstrap() {
  const library = useLibraryStore()
  const vendors = useVendorsStore()
  const quizBanners = useQuizBannersStore()
  const auth = useAuthStore()

  // Session expirée côté serveur : on repasse sur l'écran de connexion.
  setUnauthorizedHandler(() => {
    auth.isAuthenticated = false
  })

  try {
    const cfg = await api.get('/api/public/config')
    library.hydratePublic(cfg)
    vendors.hydratePublic(cfg)
    quizBanners.hydratePublic(cfg)
    auth.hydratePublic(cfg)
    await auth.checkSession()
  } catch (err) {
    // Serveur injoignable : l'application s'affiche quand même
    // ("Quizz non disponible") plutôt qu'une page blanche.
    console.error('Configuration publique indisponible :', err)
  }

  app.mount('#app')
}

bootstrap()
