import { defineStore } from 'pinia'
import { api } from '@/utils/api'

/**
 * Messages du formulaire de contact, enregistrés dans la base du serveur.
 * La liste n'est lisible que par l'admin connecté (loadAdmin) ; l'envoi
 * (addMessage) est public.
 */
export const useContactMessagesStore = defineStore('contactMessages', {
  state: () => ({
    messages: [] // [{ id, firstName, lastName, email, question, submittedAt, attachment: {filename,size}|null }]
  }),

  actions: {
    async loadAdmin() {
      const data = await api.get('/api/admin/messages')
      this.messages = data.messages
    },

    /**
     * @param {Object} params
     * @param {string} params.firstName
     * @param {string} params.lastName
     * @param {string} params.email
     * @param {string} params.question
     * @param {{filename:string, dataUrl:string}|null} [params.attachment] - PDF de
     *   résultat joint lorsque le message vient du bouton "Plus d'informations".
     * @returns {Promise<Object|null>} null si l'enregistrement a échoué
     *   (le détail est disponible via getLastApiError()).
     */
    async addMessage({ firstName, lastName, email, question, attachment = null }) {
      try {
        return await api.post('/api/contact', { firstName, lastName, email, question, attachment })
      } catch {
        return null
      }
    },

    async removeMessage(id) {
      try {
        await api.delete(`/api/admin/messages/${id}`)
      } catch {
        return false
      }
      this.messages = this.messages.filter((m) => m.id !== id)
      return true
    },

    async clearAll() {
      try {
        await api.delete('/api/admin/messages')
      } catch {
        return false
      }
      this.messages = []
      return true
    }
  }
})
