import { defineStore } from 'pinia'
import { api } from '@/utils/api'

/**
 * Une bannière de quizz : { id, title, imageDataUrl }
 * Une seule est active à la fois : son titre s'affiche en haut à gauche du
 * site et son image en en-tête des pages du quizz.
 *
 *  - active  : bannière active, visible par tous.
 *  - banners : liste d'administration, chargée une fois l'admin connecté.
 */
export const useQuizBannersStore = defineStore('quizBanners', {
  state: () => ({
    banners: [],
    activeId: null,
    active: null
  }),

  actions: {
    hydratePublic(cfg) {
      this.active = cfg?.activeBanner || null
      this.activeId = this.active?.id ?? null
    },

    async loadAdmin() {
      const data = await api.get('/api/admin/banners')
      this.banners = data.banners
      this.activeId = data.activeId
      this.active = data.banners.find((b) => b.id === data.activeId) || null
    },

    async addBanner({ title, imageDataUrl }) {
      try {
        const created = await api.post('/api/admin/banners', { title, imageDataUrl })
        await this.loadAdmin()
        return created
      } catch {
        return null
      }
    },

    async removeBanner(id) {
      try {
        await api.delete(`/api/admin/banners/${id}`)
        await this.loadAdmin()
        return true
      } catch {
        return false
      }
    },

    async setActive(id) {
      try {
        await api.put('/api/admin/active/banner', { id })
        await this.loadAdmin()
        return true
      } catch {
        return false
      }
    },

    async clearActive() {
      return this.setActive(null)
    }
  }
})
