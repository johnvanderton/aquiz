import { defineStore } from 'pinia'
import {
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_PASSWORD_HASH,
  DEFAULT_ALLOWED_ADMIN_DOMAINS
} from '@/config/adminAccess'
import { sha256Fallback } from '@/utils/sha256Fallback'

// IMPORTANT — sécurité :
// - Le mot de passe n'est JAMAIS stocké ni comparé en clair : seule son
//   empreinte SHA-256 est conservée (par défaut dans le code, ou une
//   empreinte de remplacement dans le localStorage si l'admin l'a changé
//   depuis l'onglet "Identifiants").
// - On ne stocke JAMAIS l'identifiant/mot de passe saisi dans le
//   localStorage/sessionStorage : uniquement un drapeau "connecté" côté
//   session (effacé à la fermeture de l'onglet ou à la déconnexion).
const PASSWORD_HASH_OVERRIDE_KEY = 'quiz_admin_password_hash_v1'
const ALLOWED_DOMAINS_KEY = 'quiz_admin_allowed_domains_v1'
// "Instantané" de la config (adminAccess.js) au moment où l'admin a
// enregistré sa propre liste de domaines. Sert à détecter un changement du
// fichier de config côté serveur (voir loadAllowedDomains ci-dessous).
const ALLOWED_DOMAINS_BASELINE_KEY = 'quiz_admin_allowed_domains_baseline_v1'
const SESSION_KEY = 'quiz_admin_session'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

/**
 * Détermine la liste de domaines à utiliser au démarrage.
 *
 * Problème résolu : une fois la liste enregistrée dans le localStorage,
 * elle y restait indéfiniment — même après une mise à jour du fichier de
 * config (adminAccess.js) côté serveur, qui n'avait alors plus aucun
 * effet tant qu'un admin ne revenait pas modifier la liste manuellement.
 *
 * On mémorise donc, aux côtés de la liste personnalisée, un instantané de
 * la config par défaut au moment de l'enregistrement (la "baseline"). Si
 * la config par défaut actuelle ne correspond plus à cette baseline (donc
 * si le fichier a été modifié/redéployé depuis), on considère la
 * personnalisation locale obsolète : elle est effacée et on repart des
 * valeurs à jour du fichier de config. La config serveur reprend ainsi
 * systématiquement la main après un déploiement.
 */
function loadAllowedDomains() {
  const currentBaseline = JSON.stringify(DEFAULT_ALLOWED_ADMIN_DOMAINS)
  const storedBaseline = localStorage.getItem(ALLOWED_DOMAINS_BASELINE_KEY)

  if (storedBaseline !== currentBaseline) {
    localStorage.removeItem(ALLOWED_DOMAINS_KEY)
    localStorage.removeItem(ALLOWED_DOMAINS_BASELINE_KEY)
    return [...DEFAULT_ALLOWED_ADMIN_DOMAINS]
  }

  return readJSON(ALLOWED_DOMAINS_KEY, DEFAULT_ALLOWED_ADMIN_DOMAINS)
}

// `crypto.subtle` (Web Crypto) n'existe que dans un "contexte sécurisé"
// (HTTPS, ou `localhost`). Sur un environnement de test servi en simple
// HTTP (ex. un domaine interne sans TLS comme "limac"), `crypto.subtle`
// vaut `undefined` : on utilise alors une implémentation SHA-256 en
// JavaScript pur, produisant exactement la même empreinte, pour que la
// connexion admin fonctionne malgré tout.
async function sha256Hex(text) {
  const canUseSubtleCrypto =
    typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function'

  if (canUseSubtleCrypto) {
    try {
      const data = new TextEncoder().encode(text)
      const digest = await crypto.subtle.digest('SHA-256', data)
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    } catch (err) {
      console.warn('crypto.subtle a échoué, repli sur le SHA-256 JS pur :', err)
    }
  }

  return sha256Fallback(text)
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: sessionStorage.getItem(SESSION_KEY) === 'true',
    loginError: '',
    passwordChangeError: '',
    passwordChangeSuccess: false,
    allowedDomains: loadAllowedDomains()
  }),

  getters: {
    currentPasswordHash: () => localStorage.getItem(PASSWORD_HASH_OVERRIDE_KEY) || DEFAULT_PASSWORD_HASH,

    // Le lien vers /admin n'est affiché dans le menu que si le domaine
    // consulté fait partie de cette liste (configurable dans l'onglet
    // "Identifiants"). L'accès direct à l'URL /admin reste toujours
    // possible et protégé par le login, quel que soit le domaine.
    isCurrentDomainAllowed(state) {
      if (typeof window === 'undefined') return false
      return state.allowedDomains.includes(window.location.hostname)
    }
  },

  actions: {
    async login(username, password) {
      const hash = await sha256Hex(password || '')
      if (username === DEFAULT_ADMIN_USERNAME && hash === this.currentPasswordHash) {
        this.isAuthenticated = true
        this.loginError = ''
        sessionStorage.setItem(SESSION_KEY, 'true')
        return true
      }
      this.loginError = 'Identifiant ou mot de passe incorrect.'
      return false
    },

    logout() {
      this.isAuthenticated = false
      sessionStorage.removeItem(SESSION_KEY)
    },

    async changePassword(currentPassword, newPassword) {
      this.passwordChangeError = ''
      this.passwordChangeSuccess = false

      const currentHash = await sha256Hex(currentPassword || '')
      if (currentHash !== this.currentPasswordHash) {
        this.passwordChangeError = 'Le mot de passe actuel est incorrect.'
        return false
      }
      if (!newPassword || newPassword.length < 6) {
        this.passwordChangeError = 'Le nouveau mot de passe doit contenir au moins 6 caractères.'
        return false
      }

      const newHash = await sha256Hex(newPassword)
      localStorage.setItem(PASSWORD_HASH_OVERRIDE_KEY, newHash)
      this.passwordChangeSuccess = true
      return true
    },

    setAllowedDomains(domains) {
      const cleaned = [...new Set(domains.map((d) => d.trim()).filter(Boolean))]
      this.allowedDomains = cleaned
      localStorage.setItem(ALLOWED_DOMAINS_KEY, JSON.stringify(cleaned))
      localStorage.setItem(ALLOWED_DOMAINS_BASELINE_KEY, JSON.stringify(DEFAULT_ALLOWED_ADMIN_DOMAINS))
    }
  }
})
