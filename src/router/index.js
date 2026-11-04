import { createRouter, createWebHistory } from 'vue-router'
import PublicQuizView from '@/views/PublicQuizView.vue'
import ResultsView from '@/views/ResultsView.vue'
import AdminView from '@/views/AdminView.vue'
import ContactView from '@/views/ContactView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'quiz', component: PublicQuizView },
    { path: '/resultats', name: 'resultats', component: ResultsView },
    { path: '/admin', name: 'admin', component: AdminView },
    { path: '/contact', name: 'contact', component: ContactView },
    // Toute URL non reconnue tombe ici (gestion d'exception "mauvaise URL").
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
  ]
})

export default router
