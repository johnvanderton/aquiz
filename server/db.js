import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Un seul fichier SQLite : c'est toute la persistance de l'application.
// Sauvegarde = copier ce fichier (ainsi que quiz.db-wal / quiz.db-shm si
// l'application tourne au moment de la copie).
export const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'quiz.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL            -- JSON
  );

  CREATE TABLE IF NOT EXISTS quiz_files (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    uploaded_at    TEXT NOT NULL,
    question_count INTEGER NOT NULL,
    questions      TEXT NOT NULL   -- JSON
  );

  CREATE TABLE IF NOT EXISTS vendors (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    contact_email  TEXT NOT NULL DEFAULT '',
    image_data_url TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS quiz_banners (
    id             TEXT PRIMARY KEY,
    title          TEXT NOT NULL DEFAULT '',
    image_data_url TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id                  TEXT PRIMARY KEY,
    first_name          TEXT NOT NULL,
    last_name           TEXT NOT NULL,
    email               TEXT NOT NULL,
    question            TEXT NOT NULL,
    submitted_at        TEXT NOT NULL,
    attachment_filename TEXT,
    attachment_data     BLOB
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
  );
`)

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  if (!row) return fallback
  try {
    return JSON.parse(row.value)
  } catch {
    return fallback
  }
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, JSON.stringify(value))
}

// "Actif" = élément publié/affiché côté public. Un seul par catégorie.
export const ACTIVE = {
  quiz: { setting: 'active_quiz_id', table: 'quiz_files' },
  vendor: { setting: 'active_vendor_id', table: 'vendors' },
  banner: { setting: 'active_banner_id', table: 'quiz_banners' }
}

export function getActiveId(kind) {
  return getSetting(ACTIVE[kind].setting, null)
}

export function setActiveId(kind, id) {
  setSetting(ACTIVE[kind].setting, id)
}

/** Supprime une ligne ; si c'était l'élément actif, la catégorie n'a plus d'actif. */
export function deleteItem(kind, id) {
  const { table } = ACTIVE[kind]
  const run = db.transaction(() => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
    if (info.changes > 0 && getActiveId(kind) === id) setActiveId(kind, null)
    return info.changes > 0
  })
  return run()
}
