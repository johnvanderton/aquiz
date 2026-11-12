import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DB_PATH } from './db.js'
import { seedDefaults } from './seed.js'
import { router } from './routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 4000
const HOST = process.env.HOST || '0.0.0.0'
const DIST = path.resolve(__dirname, '..', 'dist')

seedDefaults()

const app = express()
app.disable('x-powered-by')

// À activer derrière un reverse proxy (nginx, Caddy…) pour que req.ip soit
// l'IP réelle du client (limitation de débit). TRUST_PROXY=true ou un nombre.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY)
}

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin'
  })
  next()
})

// --- API ---------------------------------------------------------------------
// Les images et PDF transitent en base64 dans le JSON : limite relevée.
app.use('/api', express.json({ limit: '12mb' }))
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
app.use('/api', router)
app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue.' }))

// --- Front (build Vite) --------------------------------------------------------
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }))
  // Fallback SPA : toute URL non-API renvoie index.html (vue-router gère la page 404).
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    res.set('Cache-Control', 'no-cache')
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

// --- Gestion d'erreurs ---------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Contenu trop volumineux.' })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Requête JSON invalide.' })
  }
  const status = err.status || 500
  if (status >= 500) console.error('[quiz] Erreur serveur :', err)
  res.status(status).json({ error: status >= 500 ? 'Erreur interne du serveur.' : err.message })
})

app.listen(PORT, HOST, () => {
  console.log(`[quiz] Serveur démarré sur http://${HOST}:${PORT}`)
  console.log(`[quiz] Base de données : ${DB_PATH}`)
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.log('[quiz] Pas de dossier dist/ : lancez "npm run build" (ou utilisez "npm run dev").')
  }
})
