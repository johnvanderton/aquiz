import { idbClearDatabase } from './idbKeyval'

// Les réglages légers (mot de passe admin, domaines autorisés) restent
// dans le localStorage, préfixés par "quiz_". Les données volumineuses
// (questionnaires, bannières, messages) vivent désormais dans IndexedDB
// (voir idbKeyval.js) et sont vidées via idbClearDatabase().
const APP_PREFIX = 'quiz_'

/**
 * Estime l'espace de stockage utilisé par l'origine (IndexedDB inclus) et
 * le quota disponible, via la Storage API du navigateur. Beaucoup plus
 * représentatif que de ne mesurer que le localStorage, puisque l'essentiel
 * des données de l'application vit maintenant dans IndexedDB.
 */
export async function getAppStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate()
      return { usage, quota, supported: true }
    } catch (err) {
      console.warn('Estimation du stockage indisponible :', err)
    }
  }
  return { usage: 0, quota: 0, supported: false }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
}

/**
 * Supprime toutes les données de l'application : la base IndexedDB
 * (questionnaires, bannières, messages) ainsi que les réglages restés dans
 * le localStorage (mot de passe admin personnalisé, domaines autorisés).
 * Ne touche pas au sessionStorage (session admin en cours).
 */
export async function clearAppStorage() {
  await idbClearDatabase()

  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(APP_PREFIX)) keysToRemove.push(key)
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}
