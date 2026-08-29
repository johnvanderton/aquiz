import { defineStore } from 'pinia'
import { idbGet, idbSet } from '@/utils/idbKeyval'

const VENDORS_KEY = 'vendors_v1'
const ACTIVE_KEY = 'vendors_active_v1'

/**
 * Un "vendeur" représente un organisme/courtier avec sa propre bannière :
 * { id, name, imageDataUrl, contactEmail }
 * Un seul vendeur est actif à la fois : c'est sa bannière qui est utilisée
 * sur le formulaire de contact, le bouton "Plus d'informations" et l'en-tête
 * du PDF de résultat.
 */
export const useVendorsStore = defineStore('vendors', {
  state: () => ({
    vendors: [],
    activeId: null,
    ready: false
  }),

  getters: {
    active(state) {
      return state.vendors.find((v) => v.id === state.activeId) || null
    }
  },

  actions: {
    async init() {
      if (this.ready) return
      this.vendors = await idbGet(VENDORS_KEY, [])
      this.activeId = await idbGet(ACTIVE_KEY, null)
      this.ready = true
    },

    async persist() {
      return idbSet(VENDORS_KEY, this.vendors)
    },

    async addVendor({ name, imageDataUrl, contactEmail }) {
      const vendor = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: name || '',
        imageDataUrl: imageDataUrl || '',
        contactEmail: contactEmail || ''
      }
      this.vendors.unshift(vendor)
      const ok = await this.persist()
      if (!ok) {
        this.vendors.shift()
        return null
      }
      // Si c'est le premier vendeur créé, on l'active automatiquement.
      if (!this.activeId) await this.setActive(vendor.id)
      return vendor
    },

    async removeVendor(id) {
      const previous = this.vendors
      this.vendors = this.vendors.filter((v) => v.id !== id)
      const ok = await this.persist()
      if (!ok) {
        this.vendors = previous
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
