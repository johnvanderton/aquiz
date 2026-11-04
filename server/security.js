import crypto from 'node:crypto'
import { db } from './db.js'

// ---------------------------------------------------------------------------
// Mots de passe : scrypt (natif Node, aucune dépendance), sel aléatoire.
// ---------------------------------------------------------------------------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password, stored) {
  try {
    const [alg, saltHex, hashHex] = String(stored).split('$')
    if (alg !== 'scrypt') return false
    const expected = Buffer.from(hashHex, 'hex')
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
    return crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** Comparaison à temps constant de deux chaînes (via leurs empreintes). */
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

// ---------------------------------------------------------------------------
// Sessions : jeton aléatoire dans un cookie HttpOnly ; seule son empreinte
// SHA-256 est stockée en base (un vol de la base ne donne pas de session).
// ---------------------------------------------------------------------------
const SESSION_COOKIE = 'qz_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 heures

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

export function createSession() {
  const token = crypto.randomBytes(32).toString('hex')
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  db.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)').run(
    sha256(token),
    Date.now() + SESSION_TTL_MS
  )
  return token
}

export function isValidSession(token) {
  const row = db.prepare('SELECT expires_at FROM sessions WHERE token_hash = ?').get(sha256(token))
  return !!row && row.expires_at > Date.now()
}

export function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
}

export function destroyOtherSessions(currentToken) {
  db.prepare('DELETE FROM sessions WHERE token_hash <> ?').run(sha256(currentToken))
}

function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

export function getSessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] || null
}

// COOKIE_SECURE=true à activer dès que le site est servi en HTTPS.
const cookieFlags = () =>
  `Path=/; HttpOnly; SameSite=Lax${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`

export function setSessionCookie(res, token) {
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; ${cookieFlags()}`
  )
}

export function clearSessionCookie(res) {
  res.append('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; ${cookieFlags()}`)
}

export function requireAdmin(req, res, next) {
  const token = getSessionToken(req)
  if (!token || !isValidSession(token)) {
    return res.status(401).json({ error: 'Authentification requise.' })
  }
  req.sessionToken = token
  next()
}

// ---------------------------------------------------------------------------
// Limitation de débit simple, en mémoire, par IP.
// ---------------------------------------------------------------------------
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map() // ip -> { count, resetAt }
  return (req, res, next) => {
    const now = Date.now()
    const key = req.ip
    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count += 1
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
    }
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return res.status(429).json({ error: message || 'Trop de requêtes, réessayez plus tard.' })
    }
    next()
  }
}
