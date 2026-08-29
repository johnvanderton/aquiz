import { openDB } from 'idb'

// Toutes les données de l'application (questionnaires, bannières,
// messages de contact) sont stockées dans IndexedDB plutôt que dans le
// localStorage.
//
// Pourquoi ce changement : le localStorage est plafonné à quelques Mo
// seulement (souvent 5 à 10 Mo selon le navigateur) et se remplissait très
// vite dès qu'on y stockait plusieurs bannières/logos et des PDF de
// résultat en pièce jointe. IndexedDB n'a pas cette limite arbitraire : son
// quota dépend de l'espace disque disponible (généralement des centaines
// de Mo au minimum, souvent bien plus), ce qui le rend beaucoup plus
// robuste pour ce cas d'usage.
const DB_NAME = 'quiz_app_db'
const STORE_NAME = 'kv'
// Ce numéro doit être incrémenté à chaque changement de schéma. Il a été
// relevé ici (1 -> 2) pour forcer la (re)création du magasin d'objets chez
// les personnes ayant déjà une base "quiz_app_db" en version 1 sans le
// magasin "kv" (créée lors d'une itération antérieure du projet) : sans ce
// changement de version, IndexedDB ne redéclenche jamais le callback
// "upgrade" et toutes les lectures/écritures échouent silencieusement,
// même si le quota de stockage est loin d'être atteint.
const DB_VERSION = 2

let dbPromise = null
let lastError = null

function upgrade(db) {
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME)
  }
}

function openFreshDb() {
  return openDB(DB_NAME, DB_VERSION, { upgrade })
}

function getDb() {
  if (!dbPromise) dbPromise = openFreshDb()
  return dbPromise
}

/**
 * Repère les erreurs indiquant que la base est dans un état incohérent
 * (magasin d'objets manquant, base bloquée/corrompue) plutôt qu'un simple
 * problème passager, afin de savoir quand tenter une réparation.
 */
function isRecoverableSchemaError(err) {
  const name = err?.name || ''
  const message = err?.message || ''
  return (
    name === 'NotFoundError' ||
    /object stores? was not found/i.test(message) ||
    /store.*not.*found/i.test(message)
  )
}

/**
 * En cas d'erreur de schéma, on supprime entièrement la base locale et on
 * la recrée à neuf avant de retenter une fois l'opération. Cela répare
 * automatiquement les bases laissées dans un état incohérent par une
 * version antérieure de l'application, sans intervention manuelle.
 */
async function resetDatabase() {
  try {
    const db = await dbPromise
    db?.close()
  } catch {
    // ignore
  }
  dbPromise = null
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve() // on retente quand même l'ouverture ensuite
    req.onblocked = () => resolve()
  })
  dbPromise = openFreshDb()
  return dbPromise
}

async function withDb(operation) {
  try {
    const db = await getDb()
    return await operation(db)
  } catch (err) {
    if (isRecoverableSchemaError(err)) {
      console.warn('IndexedDB : schéma incohérent détecté, réinitialisation de la base…', err)
      try {
        const db = await resetDatabase()
        return await operation(db)
      } catch (retryErr) {
        lastError = retryErr
        throw retryErr
      }
    }
    lastError = err
    throw err
  }
}

/** Dernier message d'erreur technique rencontré, pour affichage/diagnostic dans l'UI admin. */
export function getIdbLastErrorMessage() {
  if (!lastError) return ''
  return lastError.message || String(lastError)
}

/**
 * Récupère une valeur stockée. Contrairement au localStorage, aucune
 * sérialisation JSON manuelle n'est nécessaire : IndexedDB sait stocker
 * directement des objets/tableaux JS.
 */
export async function idbGet(key, fallback = undefined) {
  try {
    const value = await withDb((db) => db.get(STORE_NAME, key))
    return value === undefined ? fallback : value
  } catch (err) {
    console.error(`IndexedDB : lecture impossible pour "${key}"`, err)
    return fallback
  }
}

/**
 * Les stores Pinia sont réactifs (les tableaux/objets de leur état sont
 * enveloppés dans des Proxy Vue). Or l'algorithme de clonage structuré
 * utilisé par IndexedDB peut échouer à cloner ces Proxy (DataCloneError),
 * ce qui provoquait un échec silencieux de l'écriture — c'est la cause du
 * message "stockage indisponible ou saturé" alors que le quota était en
 * réalité loin d'être atteint. On neutralise le problème en clonant la
 * valeur en objets/tableaux JS "bruts" (plain) avant de la transmettre à
 * IndexedDB.
 */
function toPlain(value) {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value))
}

/**
 * Enregistre une valeur. Retourne true/false selon le succès, pour que les
 * stores puissent afficher un message clair en cas d'échec plutôt que de
 * perdre silencieusement des données.
 */
export async function idbSet(key, value) {
  try {
    const plainValue = toPlain(value)
    await withDb((db) => db.put(STORE_NAME, plainValue, key))
    return true
  } catch (err) {
    console.error(`IndexedDB : écriture impossible pour "${key}"`, err)
    return false
  }
}

export async function idbDelete(key) {
  try {
    await withDb((db) => db.delete(STORE_NAME, key))
    return true
  } catch (err) {
    console.error(`IndexedDB : suppression impossible pour "${key}"`, err)
    return false
  }
}

/**
 * Supprime entièrement la base (toutes les données de l'application).
 */
export async function idbClearDatabase() {
  try {
    const db = await dbPromise
    db?.close()
  } catch {
    // ignore
  }
  dbPromise = null
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve() // se termine dès que les connexions se ferment
  })
}

/**
 * Indique si IndexedDB est disponible et utilisable dans ce contexte
 * (certains navigateurs en mode privé, ou certains iframes/sandboxes,
 * peuvent le bloquer entièrement).
 */
export async function isIdbAvailable() {
  if (typeof indexedDB === 'undefined') return false
  try {
    await getDb()
    return true
  } catch {
    return false
  }
}
