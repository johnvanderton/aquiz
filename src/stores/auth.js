import { defineStore } from 'pinia'
import { api, getLastApiError } from '@/utils/api'

// L'authentification est entièrement gérée par le serveur :
//  - le mot de passe est haché (scrypt) et vérifié côté serveur ;
//  - la session est un cookie HttpOnly (illisible depuis le JavaScript) ;
//  - rien n'est stocké dans le localStorage / sessionStorage du navigateur.
export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    loginError: '',
    passwordChangeError: '',
    passwordChangeSuccess: false,
    allowedDomains: []
  }),

  getters: {
    // Le lien vers /admin n'est affiché dans le menu que si le domaine
    // consulté fait partie de cette liste (configurable dans l'onglet
    // "Identifiants", enregistrée côté serveur). L'accès direct à l'URL
    // /admin reste possible, et protégé par le login, sur tout domaine.
    isCurrentDomainAllowed(state) {
      if (typeof window === 'undefined') return false
      return state.allowedDomains.includes(window.location.hostname.toLowerCase())
    }
  },

  actions: {
    hydratePublic(cfg) {
      this.allowedDomains = cfg?.allowedDomains || []
    },

    async checkSession() {
      try {
        const data = await api.get('/api/auth/me')
        this.isAuthenticated = !!data?.authenticated
      } catch {
        this.isAuthenticated = false
      }
    },

    async login(username, password) {
      this.loginError = ''
      try {
        await api.post('/api/auth/login', { username, password })
        this.isAuthenticated = true
        return true
      } catch (err) {
        this.loginError = err.status === 401 ? 'Identifiant ou mot de passe incorrect.' : getLastApiError()
        return false
      }
    },

    async logout() {
      try {
        await api.post('/api/auth/logout')
      } catch {
        /* la session locale est de toute façon abandonnée */
      }
      this.isAuthenticated = false
    },

    async changePassword(currentPassword, newPassword) {
      this.passwordChangeError = ''
      this.passwordChangeSuccess = false
      try {
        await api.post('/api/auth/password', { currentPassword, newPassword })
        this.passwordChangeSuccess = true
        return true
      } catch {
        this.passwordChangeError = getLastApiError()
        return false
      }
    },

    async setAllowedDomains(domains) {
      try {
        const saved = await api.put('/api/admin/allowed-domains', { domains })
        this.allowedDomains = saved.domains
        return true
      } catch {
        return false
      }
    }
  }
})
