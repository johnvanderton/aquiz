import { Router } from 'express'
import crypto from 'node:crypto'
import {
  db,
  getSetting,
  setSetting,
  getActiveId,
  setActiveId,
  deleteItem,
  ACTIVE
} from './db.js'
import {
  hashPassword,
  verifyPassword,
  safeEqual,
  createSession,
  destroySession,
  destroyOtherSessions,
  isValidSession,
  getSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAdmin,
  rateLimit
} from './security.js'

export const router = Router()

// ---------------------------------------------------------------------------
// Utilitaires de validation
// ---------------------------------------------------------------------------
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
const bad = (message) => new HttpError(400, message)
const newId = () => crypto.randomUUID()

function str(value, max, label, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw bad(`${label} : champ requis.`)
    return ''
  }
  if (typeof value !== 'string') throw bad(`${label} : texte attendu.`)
  const trimmed = value.trim()
  if (required && !trimmed) throw bad(`${label} : champ requis.`)
  if (trimmed.length > max) throw bad(`${label} : ${max} caractères maximum.`)
  return trimmed
}

const IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/
const MAX_IMAGE_CHARS = 4_000_000 // ~3 Mo binaires

function imageDataUrl(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string' || value.length > MAX_IMAGE_CHARS || !IMAGE_RE.test(value)) {
    throw bad('Image invalide (PNG, JPEG, WebP ou GIF, 3 Mo maximum).')
  }
  return value
}

/** Reconstruit un tableau de questions "propre" (seuls les champs connus). */
function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 2000) {
    throw bad('Questionnaire invalide : entre 1 et 2000 questions attendues.')
  }
  return questions.map((q, i) => {
    if (!q || typeof q !== 'object') throw bad(`Question ${i + 1} invalide.`)
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 30) {
      throw bad(`Question ${i + 1} : entre 2 et 30 réponses attendues.`)
    }
    return {
      id: typeof q.id === 'number' || typeof q.id === 'string' ? q.id : i + 1,
      text: str(q.text, 2000, `Question ${i + 1}`),
      multiple: !!q.multiple,
      options: q.options.map((o, j) => ({
        id: str(String(o?.id ?? `q${i + 1}_o${j + 1}`), 100, `Réponse ${j + 1}`),
        text: str(o?.text, 1000, `Réponse ${j + 1} de la question ${i + 1}`),
        correct: !!o?.correct
      }))
    }
  })
}

// ---------------------------------------------------------------------------
// Lecture des éléments actifs (vue publique)
// ---------------------------------------------------------------------------
function activeRow(kind) {
  const id = getActiveId(kind)
  if (!id) return null
  return db.prepare(`SELECT * FROM ${ACTIVE[kind].table} WHERE id = ?`).get(id) || null
}

function publicQuiz() {
  const r = activeRow('quiz')
  return r ? { id: r.id, name: r.name, questions: JSON.parse(r.questions) } : null
}

function publicVendor() {
  const r = activeRow('vendor')
  return r ? { id: r.id, name: r.name, imageDataUrl: r.image_data_url } : null
}

function publicBanner() {
  const r = activeRow('banner')
  return r ? { id: r.id, title: r.title, imageDataUrl: r.image_data_url } : null
}

// ===========================================================================
// PUBLIC
// ===========================================================================
router.get('/public/config', (req, res) => {
  res.json({
    thresholds: getSetting('thresholds'),
    allowedDomains: getSetting('allowed_domains', []),
    activeQuiz: publicQuiz(),
    activeVendor: publicVendor(),
    activeBanner: publicBanner()
  })
})

router.get('/public/quiz', (req, res) => {
  res.json(publicQuiz())
})

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Trop de messages envoyés depuis cette adresse, réessayez plus tard.'
})

const MAX_PDF_BYTES = 8 * 1024 * 1024

router.post('/contact', contactLimiter, (req, res) => {
  const b = req.body || {}
  const firstName = str(b.firstName, 100, 'Prénom')
  const lastName = str(b.lastName, 100, 'Nom')
  const email = str(b.email, 200, 'Email')
  const question = str(b.question, 5000, 'Question')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Adresse email invalide.')

  let attachmentFilename = null
  let attachmentData = null
  if (b.attachment) {
    const prefix = 'data:application/pdf;base64,'
    const dataUrl = b.attachment.dataUrl
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith(prefix)) {
      throw bad('Pièce jointe invalide (PDF attendu).')
    }
    const buf = Buffer.from(dataUrl.slice(prefix.length), 'base64')
    if (buf.length === 0 || buf.length > MAX_PDF_BYTES) throw bad('Pièce jointe trop volumineuse (8 Mo maximum).')
    if (buf.subarray(0, 4).toString() !== '%PDF') throw bad('La pièce jointe n’est pas un PDF valide.')
    let name = String(b.attachment.filename || 'resultat.pdf').replace(/[^\w.\- ()]/g, '_').slice(0, 120)
    if (!/\.pdf$/i.test(name)) name += '.pdf'
    attachmentFilename = name
    attachmentData = buf
  }

  const id = newId()
  db.prepare(
    `INSERT INTO contact_messages
       (id, first_name, last_name, email, question, submitted_at, attachment_filename, attachment_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, firstName, lastName, email, question, new Date().toISOString(), attachmentFilename, attachmentData)

  res.status(201).json({ id })
})

// ===========================================================================
// AUTHENTIFICATION
// ===========================================================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Trop de tentatives de connexion, réessayez dans quelques minutes.'
})

router.get('/auth/me', (req, res) => {
  const token = getSessionToken(req)
  res.json({ authenticated: !!token && isValidSession(token) })
})

router.post('/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {}
  const userOk =
    typeof username === 'string' && safeEqual(username, getSetting('admin_username', 'admin'))
  // La vérification du mot de passe est toujours exécutée (même si
  // l'identifiant est faux) pour ne pas révéler lequel des deux est erroné.
  const passOk =
    typeof password === 'string' && verifyPassword(password, getSetting('admin_password_hash', ''))

  if (!userOk || !passOk) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' })
  }
  setSessionCookie(res, createSession())
  res.json({ authenticated: true })
})

router.post('/auth/logout', (req, res) => {
  const token = getSessionToken(req)
  if (token) destroySession(token)
  clearSessionCookie(res)
  res.json({ authenticated: false })
})

router.post('/auth/password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword, getSetting('admin_password_hash', ''))) {
    throw bad('Le mot de passe actuel est incorrect.')
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    throw bad('Le nouveau mot de passe doit contenir au moins 6 caractères.')
  }
  if (newPassword.length > 200) throw bad('Le nouveau mot de passe est trop long.')

  setSetting('admin_password_hash', hashPassword(newPassword))
  destroyOtherSessions(req.sessionToken) // les autres sessions ouvertes sont invalidées
  res.json({ ok: true })
})

// ===========================================================================
// ADMINISTRATION (session requise)
// ===========================================================================
const admin = Router()
admin.use(requireAdmin)
router.use('/admin', admin)

// --- Questionnaires --------------------------------------------------------
admin.get('/files', (req, res) => {
  const files = db
    .prepare('SELECT id, name, uploaded_at, question_count FROM quiz_files ORDER BY rowid DESC')
    .all()
    .map((f) => ({ id: f.id, name: f.name, uploadedAt: f.uploaded_at, questionCount: f.question_count }))
  res.json({ files, activeId: getActiveId('quiz') })
})

admin.post('/files', (req, res) => {
  const name = str(req.body?.name, 255, 'Nom du fichier')
  const questions = validateQuestions(req.body?.questions)
  const created = {
    id: newId(),
    name,
    uploadedAt: new Date().toISOString(),
    questionCount: questions.length
  }
  db.prepare(
    'INSERT INTO quiz_files (id, name, uploaded_at, question_count, questions) VALUES (?, ?, ?, ?, ?)'
  ).run(created.id, name, created.uploadedAt, questions.length, JSON.stringify(questions))
  res.status(201).json(created)
})

admin.delete('/files/:id', (req, res) => {
  if (!deleteItem('quiz', req.params.id)) throw new HttpError(404, 'Questionnaire introuvable.')
  res.json({ ok: true })
})

// --- Vendeurs --------------------------------------------------------------
const vendorOut = (v) => ({
  id: v.id,
  name: v.name,
  contactEmail: v.contact_email,
  imageDataUrl: v.image_data_url
})

admin.get('/vendors', (req, res) => {
  const vendors = db.prepare('SELECT * FROM vendors ORDER BY rowid DESC').all().map(vendorOut)
  res.json({ vendors, activeId: getActiveId('vendor') })
})

admin.post('/vendors', (req, res) => {
  const b = req.body || {}
  const name = str(b.name, 200, 'Nom du vendeur')
  const contactEmail = str(b.contactEmail, 200, 'Email de contact', { required: false })
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw bad('Email de contact invalide.')
  const image = imageDataUrl(b.imageDataUrl)

  const id = newId()
  db.transaction(() => {
    db.prepare('INSERT INTO vendors (id, name, contact_email, image_data_url) VALUES (?, ?, ?, ?)').run(
      id, name, contactEmail, image
    )
    if (!getActiveId('vendor')) setActiveId('vendor', id) // le premier créé devient actif
  })()
  res.status(201).json({ id, name, contactEmail, imageDataUrl: image })
})

admin.delete('/vendors/:id', (req, res) => {
  if (!deleteItem('vendor', req.params.id)) throw new HttpError(404, 'Vendeur introuvable.')
  res.json({ ok: true })
})

// --- Bannières de quizz ----------------------------------------------------
const bannerOut = (b) => ({ id: b.id, title: b.title, imageDataUrl: b.image_data_url })

admin.get('/banners', (req, res) => {
  const banners = db.prepare('SELECT * FROM quiz_banners ORDER BY rowid DESC').all().map(bannerOut)
  res.json({ banners, activeId: getActiveId('banner') })
})

admin.post('/banners', (req, res) => {
  const b = req.body || {}
  const title = str(b.title, 200, 'Titre', { required: false })
  const image = imageDataUrl(b.imageDataUrl)
  if (!title && !image) throw bad('Renseignez un titre et/ou une image.')

  const id = newId()
  db.transaction(() => {
    db.prepare('INSERT INTO quiz_banners (id, title, image_data_url) VALUES (?, ?, ?)').run(id, title, image)
    if (!getActiveId('banner')) setActiveId('banner', id)
  })()
  res.status(201).json({ id, title, imageDataUrl: image })
})

admin.delete('/banners/:id', (req, res) => {
  if (!deleteItem('banner', req.params.id)) throw new HttpError(404, 'Bannière introuvable.')
  res.json({ ok: true })
})

// --- Élément actif (publier / activer / dépublier) -------------------------
admin.put('/active/:kind', (req, res) => {
  const { kind } = req.params
  if (!ACTIVE[kind]) throw new HttpError(404, 'Catégorie inconnue.')
  const id = req.body?.id ?? null
  if (id !== null) {
    if (typeof id !== 'string') throw bad('Identifiant invalide.')
    const exists = db.prepare(`SELECT 1 FROM ${ACTIVE[kind].table} WHERE id = ?`).get(id)
    if (!exists) throw new HttpError(404, 'Élément introuvable.')
  }
  setActiveId(kind, id)
  res.json({ activeId: id })
})

// --- Réglages --------------------------------------------------------------
admin.put('/thresholds', (req, res) => {
  const moyen = Number(req.body?.moyen)
  const eleve = Number(req.body?.eleve)
  if (!Number.isInteger(moyen) || !Number.isInteger(eleve) || moyen < 1 || eleve <= moyen || eleve > 99) {
    throw bad('Seuils invalides : 1 ≤ moyen < élevé ≤ 99.')
  }
  setSetting('thresholds', { moyen, eleve })
  res.json({ moyen, eleve })
})

admin.put('/allowed-domains', (req, res) => {
  const list = req.body?.domains
  if (!Array.isArray(list) || list.length > 50) throw bad('Liste de domaines invalide.')
  const domains = [
    ...new Set(
      list.map((d) => {
        if (typeof d !== 'string') throw bad('Domaine invalide.')
        const v = d.trim().toLowerCase()
        if (!v || v.length > 253 || !/^[a-z0-9.\-:[\]]+$/.test(v)) throw bad(`Domaine invalide : « ${d} ».`)
        return v
      })
    )
  ]
  setSetting('allowed_domains', domains)
  res.json({ domains })
})

// --- Messages de contact ---------------------------------------------------
admin.get('/messages', (req, res) => {
  const messages = db
    .prepare(
      `SELECT id, first_name, last_name, email, question, submitted_at,
              attachment_filename, length(attachment_data) AS attachment_size
         FROM contact_messages ORDER BY rowid DESC`
    )
    .all()
    .map((m) => ({
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      email: m.email,
      question: m.question,
      submittedAt: m.submitted_at,
      attachment: m.attachment_filename
        ? { filename: m.attachment_filename, size: m.attachment_size }
        : null
    }))
  res.json({ messages })
})

admin.get('/messages/:id/attachment', (req, res) => {
  const m = db
    .prepare('SELECT attachment_filename, attachment_data FROM contact_messages WHERE id = ?')
    .get(req.params.id)
  if (!m || !m.attachment_data) throw new HttpError(404, 'Pièce jointe introuvable.')
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${m.attachment_filename}"`,
    'X-Content-Type-Options': 'nosniff'
  })
  res.send(m.attachment_data)
})

admin.delete('/messages/:id', (req, res) => {
  const info = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id)
  if (info.changes === 0) throw new HttpError(404, 'Message introuvable.')
  res.json({ ok: true })
})

admin.delete('/messages', (req, res) => {
  db.prepare('DELETE FROM contact_messages').run()
  res.json({ ok: true })
})
