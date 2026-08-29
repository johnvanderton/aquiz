/**
 * Redimensionne et compresse une image côté client avant de la convertir
 * en base64.
 *
 * Depuis le passage du stockage au IndexedDB (voir utils/idbKeyval.js), le
 * quota n'est plus le facteur limitant qu'il était avec le localStorage :
 * les cibles ci-dessous visent surtout à éviter des images inutilement
 * lourdes (pour la rapidité d'affichage et la taille du PDF exporté), pas à
 * lutter contre un quota serré.
 *
 * @param {File} file
 * @param {{maxDim?:number, quality?:number, maxBytes?:number}} options
 * @returns {Promise<string>} data URL compressée
 */
export function resizeImageFile(file, { maxDim = 1400, quality = 0.85, maxBytes = 900 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Fichier image invalide.'))
      img.onload = () => {
        try {
          resolve(compressToTarget(img, file.type, maxDim, quality, maxBytes))
        } catch (err) {
          reject(err)
        }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function estimateBytesFromDataUrl(dataUrl) {
  const commaIdx = dataUrl.indexOf(',')
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl
  return Math.ceil((base64.length * 3) / 4)
}

function drawToCanvas(img, dim) {
  let { width, height } = img
  if (width > dim || height > dim) {
    const ratio = Math.min(dim / width, dim / height)
    width = Math.max(1, Math.round(width * ratio))
    height = Math.max(1, Math.round(height * ratio))
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(img, 0, 0, width, height)
  return canvas
}

function compressToTarget(img, originalType, startDim, startQuality, maxBytes) {
  let dim = startDim
  let q = startQuality
  // On tente d'abord de conserver le PNG (transparence) une fois, mais on
  // bascule vite sur JPEG si c'est trop lourd : un PNG complexe compresse
  // très mal et peut rester énorme même après redimensionnement.
  let mime = originalType === 'image/png' ? 'image/png' : 'image/jpeg'
  let lastDataUrl = null

  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = drawToCanvas(img, dim)
    const dataUrl = canvas.toDataURL(mime, mime === 'image/jpeg' ? q : undefined)
    lastDataUrl = dataUrl

    if (estimateBytesFromDataUrl(dataUrl) <= maxBytes) {
      return dataUrl
    }

    if (mime === 'image/png') {
      // Le PNG est trop lourd : on passe en JPEG pour la suite des essais.
      mime = 'image/jpeg'
      continue
    }

    q = Math.max(0.5, q - 0.1)
    dim = Math.max(500, Math.round(dim * 0.85))
  }

  // Dernier recours : on renvoie la meilleure tentative obtenue, même si
  // elle dépasse légèrement la cible, plutôt que d'échouer.
  return lastDataUrl
}
