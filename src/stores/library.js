import { defineStore } from 'pinia'
import { idbGet, idbSet } from '@/utils/idbKeyval'

const FILES_KEY = 'library_files_v1'
const ACTIVE_KEY = 'library_active_v1'
const THRESHOLDS_KEY = 'library_thresholds_v1'

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

export const useLibraryStore = defineStore('library', {
  state: () => ({
    files: [],        // [{ id, name, uploadedAt, questions }]
    activeId: null,
    thresholds: { ...DEFAULT_THRESHOLDS },
    ready: false
  }),

  getters: {
    activeFile(state) {
      return state.files.find((f) => f.id === state.activeId) || null
    }
  },

  actions: {
    async init() {
      if (this.ready) return
      this.files = await idbGet(FILES_KEY, [])
      this.activeId = await idbGet(ACTIVE_KEY, null)
      this.thresholds = await idbGet(THRESHOLDS_KEY, { ...DEFAULT_THRESHOLDS })
      this.ready = true
    },

    async persistFiles() {
      return idbSet(FILES_KEY, this.files)
    },

    async addFile(name, questions) {
      const file = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        uploadedAt: new Date().toISOString(),
        questions
      }
      this.files.unshift(file)
      const ok = await this.persistFiles()
      if (!ok) {
        this.files.shift()
        return null
      }
      return file
    },

    async removeFile(id) {
      const previous = this.files
      this.files = this.files.filter((f) => f.id !== id)
      const ok = await this.persistFiles()
      if (!ok) {
        this.files = previous
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
    },

    async setThresholds({ moyen, eleve }) {
      this.thresholds = { moyen, eleve }
      await idbSet(THRESHOLDS_KEY, this.thresholds)
    },

    levelFor(percent) {
      if (percent >= 100) return 'parfait'
      if (percent >= this.thresholds.eleve) return 'eleve'
      if (percent >= this.thresholds.moyen) return 'moyen'
      return 'faible'
    }
  }
})
