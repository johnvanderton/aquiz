// Valeurs par défaut de la sécurité admin.
//
// SÉCURITÉ : le mot de passe n'est jamais stocké ni comparé en clair.
// Seule son empreinte SHA-256 est conservée. Pour changer le mot de passe
// par défaut avant déploiement, remplacez DEFAULT_PASSWORD_HASH par le
// résultat de :
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('nouveau-mdp'))
// (ou plus simplement via l'onglet admin "Identifiants" une fois connecté).
export const DEFAULT_ADMIN_USERNAME = 'admin'

// SHA-256 de "quizz2026"
export const DEFAULT_PASSWORD_HASH =
  '430c241f84c85a7f03a3d36c39cc489703f74708492afc659c28622cad541af3'

// Domaines sur lesquels le lien vers /admin est affiché dans le menu.
// L'accès direct à /admin (via son URL) reste toujours possible et protégé
// par le login sur n'importe quel domaine : cette liste ne fait que
// masquer/afficher le lien de navigation.
export const DEFAULT_ALLOWED_ADMIN_DOMAINS = ['localhost', '127.0.0.1', '::1']
