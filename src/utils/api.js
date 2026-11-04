// Client HTTP minimal pour l'API du serveur (cookies de session inclus).
// Toute la persistance de l'application passe par là : le navigateur ne
// conserve plus rien en local (ni IndexedDB, ni localStorage).

let lastError = ''
let unauthorizedHandler = null

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/** Dernier message d'erreur renvoyé par le serveur (pour l'afficher à l'utilisateur). */
export function getLastApiError() {
  return lastError
}

/** Appelé quand le serveur répond 401 hors connexion (session expirée). */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

async function request(method, url, body) {
  let res
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    lastError = 'Serveur injoignable. Vérifiez votre connexion.'
    throw new ApiError(lastError, 0)
  }

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    lastError = data?.error || `Erreur serveur (${res.status}).`
    if (res.status === 401 && url !== '/api/auth/login' && unauthorizedHandler) unauthorizedHandler()
    throw new ApiError(lastError, res.status)
  }
  return data
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  put: (url, body = {}) => request('PUT', url, body),
  delete: (url) => request('DELETE', url)
}
