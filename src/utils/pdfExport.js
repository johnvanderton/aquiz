import { jsPDF } from 'jspdf'

const MARGIN = 48
const LINE_HEIGHT = 13
const OPTION_FONT_SIZE = 10
const QUESTION_FONT_SIZE = 11
const LOGO_HEIGHT = 90 // bannière/logo du vendeur, bien agrandi en en-tête
const CHAR_SPACE = -0.3 // resserre l'espacement entre les caractères

function ensureSpace(doc, y, needed) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - MARGIN) {
    doc.addPage()
    return MARGIN + 8
  }
  return y
}

function writeWrapped(doc, text, x, y, maxWidth, { bold = false, underline = false } = {}) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  const lines = doc.splitTextToSize(text, maxWidth)

  lines.forEach((line) => {
    y = ensureSpace(doc, y, LINE_HEIGHT)
    doc.text(line, x, y)
    if (underline) {
      const width = doc.getTextWidth(line)
      doc.setLineWidth(0.6)
      doc.line(x, y + 2.4, x + width, y + 2.4)
    }
    y += LINE_HEIGHT
  })

  return y
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Impossible de charger le logo.'))
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
 * Construit le document PDF de résultat (sans l'enregistrer), afin de
 * pouvoir soit le télécharger directement, soit en récupérer un Blob pour
 * le joindre à un email/partage.
 *
 * @returns {Promise<{doc: jsPDF, refLabel: string}>}
 */
async function buildResultsPdf({ fileName, vendorLogoDataUrl, score, level, results }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setCharSpace(CHAR_SPACE)

  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - MARGIN * 2
  let y = 56

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // En-tête : uniquement le logo du vendeur (agrandi), sans texte associé.
  if (vendorLogoDataUrl) {
    try {
      const img = await loadImage(vendorLogoDataUrl)
      const ratio = img.naturalWidth / (img.naturalHeight || 1)
      const targetHeight = LOGO_HEIGHT
      const targetWidth = targetHeight * (Number.isFinite(ratio) && ratio > 0 ? ratio : 1)
      const format = pickImageFormat(vendorLogoDataUrl)
      const logoTop = y - 14

      doc.addImage(vendorLogoDataUrl, format, MARGIN, logoTop, targetWidth, targetHeight)
      y = logoTop + targetHeight + 24
    } catch (err) {
      console.warn('Logo non inséré dans le PDF :', err)
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(20)
  y = ensureSpace(doc, y, 26)
  doc.text('Résultat du quizz', MARGIN, y)
  y += 22

  const refLabel = `Réf : ${buildDocumentReference(fileName)}`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90)
  y = writeWrapped(doc, refLabel, MARGIN, y, maxWidth)
  y = writeWrapped(doc, `Date : ${dateStr}`, MARGIN, y, maxWidth)
  y += 14

  // Score
  doc.setDrawColor(220)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  y += 26

  doc.setTextColor(20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text(`${score.correct} / ${score.total}`, MARGIN, y)
  y += 20

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`${score.percent}% de bonnes réponses`, MARGIN, y)
  y += 18

  doc.setFont('helvetica', 'bold')
  doc.text(`Appréciation : ${level.label}`, MARGIN, y)
  y += 30

  doc.setDrawColor(220)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  y += 24

  // Détail des questions
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(20)
  y = ensureSpace(doc, y, 20)
  doc.text('Détail des réponses', MARGIN, y)
  y += 20

  results.forEach((r, idx) => {
    doc.setFontSize(QUESTION_FONT_SIZE)
    doc.setTextColor(r.isCorrect ? 46 : 150, r.isCorrect ? 110 : 40, r.isCorrect ? 80 : 30)
    const statusMark = r.isCorrect ? '✔' : '✘'
    y = ensureSpace(doc, y, LINE_HEIGHT)
    y = writeWrapped(doc, `${statusMark} ${idx + 1}. ${r.question.text}`, MARGIN, y, maxWidth, {
      bold: true
    })
    y += 4

    doc.setFontSize(OPTION_FONT_SIZE)
    doc.setTextColor(70)

    r.question.options.forEach((option) => {
      const isGiven = Array.isArray(r.given)
        ? r.given.includes(option.id)
        : r.given === option.id

      const bullet = option.correct ? '  ✔ ' : isGiven ? '  ✘ ' : '  - '
      const label = option.correct ? `${option.text} (bonne réponse)` : option.text

      doc.setTextColor(
        option.correct ? 40 : isGiven ? 150 : 70,
        option.correct ? 110 : isGiven ? 40 : 70,
        option.correct ? 60 : isGiven ? 30 : 70
      )

      y = writeWrapped(doc, `${bullet}${label}`, MARGIN + 10, y, maxWidth - 10, {
        bold: option.correct,
        underline: isGiven
      })
    })

    y += 12
    doc.setTextColor(70)
  })

  return { doc, refLabel }
}

/**
 * Génère le PDF et déclenche son téléchargement.
 */
export async function exportResultsToPdf(params) {
  const { doc, refLabel } = await buildResultsPdf(params)
  const safeName = refLabel.replace(/^Réf\s*:\s*/i, '').replace(/[^a-z0-9-_]+/gi, '_')
  doc.save(`resultat-${safeName}.pdf`)
}

/**
 * Génère le PDF et le retourne sous forme de Blob (+ nom de fichier
 * suggéré), pour un envoi en pièce jointe (Web Share API) ou tout autre
 * usage ne nécessitant pas un téléchargement direct.
 */
export async function getResultsPdfBlob(params) {
  const { doc, refLabel } = await buildResultsPdf(params)
  const safeName = refLabel.replace(/^Réf\s*:\s*/i, '').replace(/[^a-z0-9-_]+/gi, '_')
  const filename = `resultat-${safeName}.pdf`
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
