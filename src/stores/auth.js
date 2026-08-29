import { defineStore } from 'pinia'
import {
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_PASSWORD_HASH,
  DEFAULT_ALLOWED_ADMIN_DOMAINS
} from '@/config/adminAccess'

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
const SESSION_KEY = 'quiz_admin_session'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: sessionStorage.getItem(SESSION_KEY) === 'true',
    loginError: '',
    passwordChangeError: '',
    passwordChangeSuccess: false,
    allowedDomains: readJSON(ALLOWED_DOMAINS_KEY, DEFAULT_ALLOWED_ADMIN_DOMAINS)
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
    }
  }
})
