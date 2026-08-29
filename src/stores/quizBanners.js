import { defineStore } from 'pinia'
import { idbGet, idbSet } from '@/utils/idbKeyval'

const BANNERS_KEY = 'quiz_banners_v1'
const ACTIVE_KEY = 'quiz_banners_active_v1'

/**
 * Une bannière de quizz : { id, title, imageDataUrl }
 * Une seule est active à la fois : son titre s'affiche en haut à gauche du
 * site et son image en en-tête de la page publique du quizz.
 */
export const useQuizBannersStore = defineStore('quizBanners', {
  state: () => ({
    banners: [],
    activeId: null,
    ready: false
  }),

  getters: {
    active(state) {
      return state.banners.find((b) => b.id === state.activeId) || null
    }
  },

  actions: {
    async init() {
      if (this.ready) return
      this.banners = await idbGet(BANNERS_KEY, [])
      this.activeId = await idbGet(ACTIVE_KEY, null)
      this.ready = true
    },

    async persist() {
      return idbSet(BANNERS_KEY, this.banners)
    },

    async addBanner({ title, imageDataUrl }) {
      const banner = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: title || '',
        imageDataUrl: imageDataUrl || ''
      }
      this.banners.unshift(banner)
      const ok = await this.persist()
      if (!ok) {
        this.banners.shift()
        return null
      }
      if (!this.activeId) await this.setActive(banner.id)
      return banner
    },

    async removeBanner(id) {
      const previous = this.banners
      this.banners = this.banners.filter((b) => b.id !== id)
      const ok = await this.persist()
      if (!ok) {
        this.banners = previous
        return false
      }
      if (this.activeId === id) await this.clearActive()
      return true
    },

    async setActive(id) {
      this.activeId = id
      await idbSet(ACTIVE_KEY, id)
    },

    async clearActive() {
      this.activeId = null
      await idbSet(ACTIVE_KEY, null)
    }
  }
})
