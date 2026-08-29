import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vuetify from './plugins/vuetify'
import router from './router'
import App from './App.vue'
import { useLibraryStore } from './stores/library'
import { useVendorsStore } from './stores/vendors'
import { useQuizBannersStore } from './stores/quizBanners'
import { useContactMessagesStore } from './stores/contactMessages'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

// Les données volumineuses (questionnaires, bannières, messages avec pièces
// jointes) vivent dans IndexedDB plutôt que le localStorage (voir
// utils/idbKeyval.js). La lecture y est asynchrone : on hydrate ces stores
// avant de monter l'application pour éviter tout affichage transitoire de
// données vides.
async function bootstrap() {
  await Promise.all([
    useLibraryStore().init(),
    useVendorsStore().init(),
    useQuizBannersStore().init(),
    useContactMessagesStore().init()
  ])
  app.mount('#app')
}

bootstrap()
