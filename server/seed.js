import { getSetting, setSetting } from './db.js'
import { hashPassword } from './security.js'

/**
 * Initialise les réglages manquants au premier démarrage. Les valeurs déjà
 * présentes en base ne sont JAMAIS écrasées : après le premier lancement,
 * c'est l'interface d'administration qui fait foi.
 *
 * Variables d'environnement (optionnelles, utilisées uniquement pour ce
 * premier remplissage) :
 *   ADMIN_USERNAME         (défaut : admin)
 *   ADMIN_PASSWORD         (défaut : quizz2026 — À CHANGER)
 *   ADMIN_ALLOWED_DOMAINS  liste séparée par des virgules (défaut : localhost,127.0.0.1,::1)
 */
export function seedDefaults() {
  if (getSetting('admin_username') === null) {
    setSetting('admin_username', process.env.ADMIN_USERNAME || 'admin')
  }

  if (getSetting('admin_password_hash') === null) {
    const initial = process.env.ADMIN_PASSWORD || 'quizz2026'
    setSetting('admin_password_hash', hashPassword(initial))
    if (!process.env.ADMIN_PASSWORD) {
      console.warn(
        '[quiz] ⚠ Mot de passe admin par défaut ("quizz2026") utilisé : changez-le depuis ' +
          "l'onglet Identifiants, ou définissez ADMIN_PASSWORD avant le premier démarrage."
      )
    }
  }

  if (getSetting('thresholds') === null) {
    setSetting('thresholds', { moyen: 40, eleve: 70 })
  }

  if (getSetting('allowed_domains') === null) {
    const fromEnv = (process.env.ADMIN_ALLOWED_DOMAINS || '')
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
    setSetting('allowed_domains', fromEnv.length ? fromEnv : ['localhost', '127.0.0.1', '::1', 'limac'])
  }
}
