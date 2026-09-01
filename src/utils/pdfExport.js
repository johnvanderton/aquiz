import { jsPDF } from 'jspdf'

// --- Mise en page générale -------------------------------------------------
const MARGIN = 48
const BANNER_TOP_OFFSET = 26 // légèrement plus proche du bord supérieur que MARGIN
const PAGE_NUMBER_MARGIN = 24

// --- Typographie ------------------------------------------------------------
// "helvetica" est la police intégrée à jsPDF métriquement la plus proche
// d'Arial (Arial n'est pas embarquable nativement dans jsPDF sans charger
// une fonte custom) ; aucun espacement de caractères n'est appliqué
// (comportement par défaut de jsPDF), conformément à la consigne.
const FONT_FAMILY = 'helvetica'
const TITLE_LINE_HEIGHT = 15
const ANSWER_LINE_HEIGHT = 13
const OPTION_INDENT = 12
const SCORE_FONT_SIZE = 17 // réduit (auparavant 24)

// --- Couleurs -----------------------------------------------------------
const COLOR_TITLE = [25, 25, 25] // quasi-noir pour les titres de question
const COLOR_CORRECT = [21, 128, 61] // vert : bonne(s) réponse(s)
const COLOR_WRONG = [185, 28, 28] // rouge : réponse erronée choisie par l'utilisateur
const COLOR_NEUTRAL = [15, 15, 15] // noir : le reste des réponses
const COLOR_MUTED = [110, 110, 110] // gris : date/référence en en-tête
const COLOR_RULE = [222, 222, 222] // gris clair : lignes de séparation

// --- Bannière vendeur (en-tête) -------------------------------------------
// La bannière doit occuper au moins 50% de la largeur de la page : on vise
// 60% pour un rendu confortablement au-dessus du minimum requis, avec un
// plafond de hauteur pour éviter qu'un logo carré/haut ne devienne
// disproportionné.
const BANNER_WIDTH_RATIO = 0.6
const BANNER_MIN_WIDTH_RATIO = 0.5
const BANNER_MAX_HEIGHT = 150

/**
 * Ajoute une nouvelle page si le contenu à venir ("needed" pt de hauteur)
 * ne tient pas dans l'espace restant avant le bas de la zone imprimable.
 */
function ensureSpace(doc, y, needed) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - MARGIN) {
    doc.addPage()
    return MARGIN
  }
  return y
}

/**
 * Écrit un texte en le repliant automatiquement pour ne jamais dépasser
 * "maxWidth", avec saut de page automatique dès qu'une ligne ne tient plus
 * dans la hauteur restante — aucun contenu ne peut ainsi sortir du cadre
 * imprimable, ni horizontalement ni verticalement.
 */
function writeWrapped(doc, text, x, y, maxWidth, lineHeight, { bold = false, color = COLOR_NEUTRAL } = {}) {
  doc.setFont(FONT_FAMILY, bold ? 'bold' : 'normal')
  doc.setTextColor(...color)

  const lines = doc.splitTextToSize(text, maxWidth)
  lines.forEach((line) => {
    y = ensureSpace(doc, y, lineHeight)
    doc.text(line, x, y)
    y += lineHeight
  })

  return y
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Impossible de charger la bannière du vendeur.'))
    img.src = dataUrl
  })
}

function pickImageFormat(dataUrl) {
  const match = /^data:image\/(\w+);base64/i.exec(dataUrl || '')
  const ext = (match?.[1] || '').toLowerCase()
  if (ext === 'png') return 'PNG'
  if (ext === 'webp') return 'WEBP'
  return 'JPEG'
}

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
function randomAlphanumeric(length) {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]
  }
  return out
}

/**
 * Retire l'extension .docx (insensible à la casse) et ajoute un suffixe de
 * 3 caractères alphanumériques aléatoires.
 */
function buildDocumentReference(fileName) {
  const base = (fileName || 'quizz').replace(/\.docx$/i, '')
  return `${base}-${randomAlphanumeric(3)}`
}

/**
 * Dessine la bannière du vendeur, centrée horizontalement, dimensionnée à
 * au moins 50% de la largeur de page (60% visé), en conservant son ratio
 * d'aspect. Retourne le nouveau y sous la bannière.
 */
async function drawVendorBanner(doc, vendorLogoDataUrl, pageWidth, y) {
  if (!vendorLogoDataUrl) return y

  try {
    const img = await loadImage(vendorLogoDataUrl)
    const ratio = img.naturalWidth / (img.naturalHeight || 1) || 1

    let width = pageWidth * BANNER_WIDTH_RATIO
    let height = width / ratio

    if (height > BANNER_MAX_HEIGHT) {
      height = BANNER_MAX_HEIGHT
      width = height * ratio
    }

    // Garde-fou : ne jamais descendre sous le minimum de 50% de la largeur
    // de page tant que la hauteur obtenue reste raisonnable.
    const minWidth = pageWidth * BANNER_MIN_WIDTH_RATIO
    if (width < minWidth && minWidth / ratio <= BANNER_MAX_HEIGHT * 1.5) {
      width = minWidth
      height = width / ratio
    }

    const format = pickImageFormat(vendorLogoDataUrl)
    const x = (pageWidth - width) / 2

    doc.addImage(vendorLogoDataUrl, format, x, y, width, height)
    return y + height + 20
  } catch (err) {
    console.warn('Bannière vendeur non insérée dans le PDF :', err)
    return y
  }
}

/**
 * Dessine l'intégralité du contenu du document sur "doc" : bannière,
 * en-tête (référence + date + nombre total de pages), score, puis le
 * détail des questions/réponses.
 *
 * Le nombre total de pages n'étant connu qu'une fois tout le contenu posé,
 * cette fonction est appelée deux fois (voir buildResultsPdf) : une
 * première passe "à blanc" pour compter les pages, puis une seconde passe
 * définitive où ce total est inséré dans le sous-titre d'en-tête.
 */
async function renderContent(doc, { vendorLogoDataUrl, score, results, refLabel, dateStr, totalPagesLabel }) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - MARGIN * 2
  let y = BANNER_TOP_OFFSET

  // --- En-tête : bannière vendeur centrée, puis sous-titre (référence,
  // date, nombre total de pages) ---------------------------------------
  y = await drawVendorBanner(doc, vendorLogoDataUrl, pageWidth, y)

  doc.setFont(FONT_FAMILY, 'normal')
  doc.setFontSize(10)
  const headerLine = `${refLabel}    •    Date : ${dateStr}    •    ${totalPagesLabel}`
  y = writeWrapped(doc, headerLine, MARGIN, y + 12, maxWidth, ANSWER_LINE_HEIGHT, {
    color: COLOR_MUTED
  })
  y += 10

  doc.setDrawColor(...COLOR_RULE)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  y += 26

  // --- Score (sans l'appréciation), taille réduite -------------------------
  doc.setFont(FONT_FAMILY, 'bold')
  doc.setFontSize(SCORE_FONT_SIZE)
  doc.setTextColor(...COLOR_TITLE)
  y = ensureSpace(doc, y, SCORE_FONT_SIZE + 6)
  doc.text(`Score : ${score.correct} / ${score.total} (${score.percent}%)`, MARGIN, y)
  y += SCORE_FONT_SIZE + 12

  doc.setDrawColor(...COLOR_RULE)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  y += 24

  // --- Détail des questions -------------------------------------------------
  doc.setFont(FONT_FAMILY, 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLOR_TITLE)
  y = ensureSpace(doc, y, 20)
  doc.text('Détail des réponses', MARGIN, y)
  y += 20

  results.forEach((r, idx) => {
    // Titre de question : gras, taille supérieure aux réponses, sans
    // espacement de caractères particulier, couleur neutre.
    y = ensureSpace(doc, y, TITLE_LINE_HEIGHT)
    y = writeWrapped(
      doc,
      `${idx + 1}. ${r.question.text}`,
      MARGIN,
      y,
      maxWidth,
      TITLE_LINE_HEIGHT,
      { bold: true, color: COLOR_TITLE }
    )
    y += 4

    r.question.options.forEach((option) => {
      const isGiven = Array.isArray(r.given)
        ? r.given.includes(option.id)
        : r.given === option.id
      const isWrongPick = isGiven && !option.correct

      let color = COLOR_NEUTRAL
      let bold = false
      if (option.correct) {
        color = COLOR_CORRECT
        bold = true
      } else if (isWrongPick) {
        color = COLOR_WRONG
        bold = true
      }

      y = writeWrapped(
        doc,
        `•  ${option.text}`,
        MARGIN + OPTION_INDENT,
        y,
        maxWidth - OPTION_INDENT,
        ANSWER_LINE_HEIGHT,
        { bold, color }
      )
    })

    y += 12
  })
}

/**
 * Construit le document PDF de résultat (sans l'enregistrer), afin de
 * pouvoir soit le télécharger directement, soit en récupérer un Blob pour
 * le joindre à un email/partage.
 *
 * @returns {Promise<{doc: jsPDF, refLabel: string}>}
 */
async function buildResultsPdf({ fileName, vendorLogoDataUrl, score, results }) {
  const refLabel = `Réf : ${buildDocumentReference(fileName)}`
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Passe 1 (à blanc) : uniquement pour connaître le nombre total de pages,
  // puisque celui-ci doit apparaître dans le sous-titre d'en-tête dès la
  // première page.
  const dryDoc = new jsPDF({ unit: 'pt', format: 'a4' })
  await renderContent(dryDoc, {
    vendorLogoDataUrl,
    score,
    results,
    refLabel,
    dateStr,
    totalPagesLabel: 'Document de … page(s)'
  })
  const totalPages = dryDoc.internal.getNumberOfPages()

  // Passe 2 (définitive) : le sous-titre inclut désormais le total de pages.
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  await renderContent(doc, {
    vendorLogoDataUrl,
    score,
    results,
    refLabel,
    dateStr,
    totalPagesLabel: `Document de ${totalPages} page${totalPages > 1 ? 's' : ''}`
  })

  // --- Numérotation des pages (bas à droite, sur chaque page) --------------
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont(FONT_FAMILY, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - MARGIN, pageHeight - PAGE_NUMBER_MARGIN, {
      align: 'right'
    })
  }

  return { doc, refLabel }
}

function safeFileBase(refLabel) {
  return refLabel.replace(/^Réf\s*:\s*/i, '').replace(/[^a-z0-9-_]+/gi, '_')
}

/**
 * Génère le PDF et déclenche son téléchargement.
 */
export async function exportResultsToPdf(params) {
  const { doc, refLabel } = await buildResultsPdf(params)
  doc.save(`resultat-${safeFileBase(refLabel)}.pdf`)
}

/**
 * Génère le PDF et le retourne sous forme de Blob (+ nom de fichier
 * suggéré), pour un envoi en pièce jointe (Web Share API) ou tout autre
 * usage ne nécessitant pas un téléchargement direct.
 */
export async function getResultsPdfBlob(params) {
  const { doc, refLabel } = await buildResultsPdf(params)
  const filename = `resultat-${safeFileBase(refLabel)}.pdf`
  const blob = doc.output('blob')
  return { blob, filename }
}

/**
 * Convertit un Blob PDF en data URL base64, pour une persistance simple
 * (ex. stockage aux côtés d'un message de contact dans le "fichier plat").
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Conversion du PDF impossible.'))
    reader.readAsDataURL(blob)
  })
}
