import { defineStore } from 'pinia'
import { api } from '@/utils/api'

/**
 * Un "vendeur" représente un organisme/courtier avec sa propre bannière :
 * { id, name, imageDataUrl, contactEmail }
 * Un seul vendeur est actif à la fois : c'est sa bannière qui est utilisée
 * sur le formulaire de contact et en en-tête du PDF de résultat.
 *
 *  - active  : vendeur actif ({ id, name, imageDataUrl }), visible par tous.
 *  - vendors : liste d'administration (avec l'email de contact), chargée
 *              uniquement une fois l'admin connecté (loadAdmin).
 */
export const useVendorsStore = defineStore('vendors', {
  state: () => ({
    vendors: [],
    activeId: null,
    active: null
  }),

  actions: {
    hydratePublic(cfg) {
      this.active = cfg?.activeVendor || null
      this.activeId = this.active?.id ?? null
    },

    async loadAdmin() {
      const data = await api.get('/api/admin/vendors')
      this.vendors = data.vendors
      this.activeId = data.activeId
      this.active = data.vendors.find((v) => v.id === data.activeId) || null
    },

    async addVendor({ name, imageDataUrl, contactEmail }) {
      try {
        const created = await api.post('/api/admin/vendors', { name, imageDataUrl, contactEmail })
        await this.loadAdmin() // le serveur active automatiquement le premier vendeur créé
        return created
      } catch {
        return null
      }
    },

    async removeVendor(id) {
      try {
        await api.delete(`/api/admin/vendors/${id}`)
        await this.loadAdmin()
        return true
      } catch {
        return false
      }
    },

    async setActive(id) {
      try {
        await api.put('/api/admin/active/vendor', { id })
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
