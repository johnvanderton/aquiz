import { defineStore } from 'pinia'
import { api } from '@/utils/api'

// Seuils par défaut (en % de bonnes réponses) :
// faible  : 0    -> moyen (exclu)
// moyen   : moyen -> eleve (exclu)
// eleve   : eleve -> 100 (exclu)
// parfait : 100
const DEFAULT_THRESHOLDS = { moyen: 40, eleve: 70 }

export const LEVELS = {
  faible: { label: 'Faible', color: 'error', icon: 'mdi-emoticon-sad-outline' },
  moyen: { label: 'Moyen', color: 'warning', icon: 'mdi-emoticon-neutral-outline' },
  eleve: { label: 'Élevé', color: 'info', icon: 'mdi-emoticon-happy-outline' },
  parfait: { label: 'Parfait', color: 'success', icon: 'mdi-emoticon-excited-outline' }
}

/**
 * Questionnaires + seuils d'appréciation. Tout est persisté côté serveur.
 *  - activeFile : quiz publié ({ id, name, questions }), visible par tous.
 *  - files      : liste d'administration ({ id, name, uploadedAt, questionCount }),
 *                 chargée uniquement une fois l'admin connecté (loadAdmin).
 */
export const useLibraryStore = defineStore('library', {
  state: () => ({
    files: [],
    activeId: null,
    activeFile: null,
    thresholds: { ...DEFAULT_THRESHOLDS }
  }),

  actions: {
    hydratePublic(cfg) {
      this.thresholds = cfg?.thresholds || { ...DEFAULT_THRESHOLDS }
      this.activeFile = cfg?.activeQuiz || null
      this.activeId = this.activeFile?.id ?? null
    },

    async loadAdmin() {
      const data = await api.get('/api/admin/files')
      this.files = data.files
      this.activeId = data.activeId
    },

    /** Recharge le quiz publié (ex. : un admin vient de le changer). */
    async refreshActive() {
      const quiz = await api.get('/api/public/quiz')
      this.activeFile = quiz
      this.activeId = quiz?.id ?? null
    },

    async addFile(name, questions) {
      try {
        const created = await api.post('/api/admin/files', { name, questions })
        this.files.unshift(created)
        return created
      } catch {
        return null
      }
    },

    async removeFile(id) {
      try {
        await api.delete(`/api/admin/files/${id}`)
      } catch {
        return false
      }
      this.files = this.files.filter((f) => f.id !== id)
      if (this.activeId === id) {
        this.activeId = null
        this.activeFile = null
      }
      return true
    },

    async setActive(id) {
      try {
        await api.put('/api/admin/active/quiz', { id })
        await this.refreshActive()
        return true
      } catch {
        return false
      }
    },

    async clearActive() {
      try {
        await api.put('/api/admin/active/quiz', { id: null })
        this.activeId = null
        this.activeFile = null
        return true
      } catch {
        return false
      }
    },

    async setThresholds({ moyen, eleve }) {
      try {
        const saved = await api.put('/api/admin/thresholds', { moyen, eleve })
        this.thresholds = saved
        return true
      } catch {
        return false
      }
    },

    levelFor(percent) {
      if (percent >= 100) return 'parfait'
      if (percent >= this.thresholds.eleve) return 'eleve'
      if (percent >= this.thresholds.moyen) return 'moyen'
      return 'faible'
    }
  }
})
