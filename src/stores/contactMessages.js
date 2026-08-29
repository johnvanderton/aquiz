import { defineStore } from 'pinia'
import { idbGet, idbSet } from '@/utils/idbKeyval'

// Émulation d'un "fichier plat" : toutes les soumissions du formulaire de
// contact sont conservées comme une liste d'enregistrements dans IndexedDB
// (append-only, comme un fichier plat). C'est suffisant pour une démo
// mono-poste ; en production, ces écritures devraient être envoyées à un
// vrai backend (fichier serveur ou base de données) — voir le README.
//
// IndexedDB est utilisé plutôt que le localStorage car les messages
// peuvent inclure le PDF de résultat en pièce jointe (potentiellement
// plusieurs centaines de Ko), ce qui remplit très vite le quota limité du
// localStorage.
const MESSAGES_KEY = 'contact_messages_v1' // le "fichier plat"

export const useContactMessagesStore = defineStore('contactMessages', {
  state: () => ({
    messages: [],
    ready: false
  }),

  actions: {
    async init() {
      if (this.ready) return
      this.messages = await idbGet(MESSAGES_KEY, [])
      this.ready = true
    },

    async persist() {
      return idbSet(MESSAGES_KEY, this.messages)
    },

    /**
     * @param {Object} params
     * @param {string} params.firstName
     * @param {string} params.lastName
     * @param {string} params.email
     * @param {string} params.question
     * @param {{filename:string, dataUrl:string}|null} [params.attachment] -
     *   PDF de résultat du quizz, joint automatiquement lorsque le message
     *   est envoyé depuis le bouton "Plus d'informations" de la page
     *   résultats.
     * @returns {Promise<Object|null>} le message créé, ou null si la sauvegarde a échoué
     */
    async addMessage({ firstName, lastName, email, question, attachment = null }) {
      const message = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        firstName,
        lastName,
        email,
        question,
        attachment: attachment || null,
        submittedAt: new Date().toISOString()
      }
      this.messages.unshift(message)
      const ok = await this.persist()
      if (!ok) {
        this.messages.shift()
        return null
      }
      return message
    },

    async removeMessage(id) {
      const previous = this.messages
      this.messages = this.messages.filter((m) => m.id !== id)
      const ok = await this.persist()
      if (!ok) this.messages = previous
      return ok
    },

    async clearAll() {
      const previous = this.messages
      this.messages = []
      const ok = await this.persist()
      if (!ok) this.messages = previous
      return ok
    }
  }
})
