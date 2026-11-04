import mammoth from 'mammoth'

/**
 * Convention attendue dans le fichier .docx :
 *
 *   1. Quelle est la capitale de la France ?
 *   A) Londres
 *   B) **Paris**        <- la ou les bonnes réponses sont mises en GRAS
 *   C) Berlin
 *   D) Madrid
 *
 * - Une question commence par "N." ou "N)" (N = numéro).
 * - Une réponse commence par une lettre suivie de "." ")" ou "-".
 * - La ou les réponses correctes doivent être en gras dans Word.
 *   Plusieurs réponses en gras => question à réponses multiples (cases à
 *   cocher), sinon réponse unique (boutons radio).
 *
 * @param {File} file - fichier .docx sélectionné par l'utilisateur
 * @returns {Promise<Array<{id:number, text:string, multiple:boolean, options:Array<{id:string, text:string, correct:boolean}>}>>}
 */
export async function parseDocxQuiz(file) {
  const arrayBuffer = await file.arrayBuffer()
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer },
    { styleMap: ['b => strong', 'i => em'] }
  )

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const paragraphs = Array.from(doc.body.querySelectorAll('p, li'))

  const questionRegex = /^\s*(\d+)\s*[.)]\s*(.+)$/
  const optionRegex = /^\s*([A-Za-zÀ-ÿ])\s*[.)\-]\s*(.+)$/

  const questions = []
  let current = null
  let optionCounter = 0

  for (const p of paragraphs) {
    const rawText = (p.textContent || '').trim()
    if (!rawText) continue

    const qMatch = rawText.match(questionRegex)
    const oMatch = rawText.match(optionRegex)

    if (qMatch && (!current || current.options.length === 0 || !oMatch)) {
      current = {
        id: questions.length + 1,
        text: qMatch[2].trim(),
        multiple: false,
        options: []
      }
      questions.push(current)
      optionCounter = 0
      continue
    }

    if (oMatch && current) {
      optionCounter += 1
      const isBold = paragraphHasBold(p)
      current.options.push({
        id: `q${current.id}_o${optionCounter}`,
        text: oMatch[2].trim(),
        correct: isBold
      })
      continue
    }

    if (current && current.options.length === 0 && rawText) {
      current.text = `${current.text} ${rawText}`.trim()
    }
  }

  for (const q of questions) {
    const correctCount = q.options.filter((o) => o.correct).length
    q.multiple = correctCount > 1
  }

  return questions.filter((q) => q.options.length >= 2)
}

function paragraphHasBold(p) {
  const strongEls = p.querySelectorAll('strong, b')
  if (strongEls.length === 0) return false
  const boldText = Array.from(strongEls)
    .map((el) => el.textContent || '')
    .join('')
    .trim()
  const fullText = (p.textContent || '').trim()
  return boldText.length >= Math.max(3, fullText.length * 0.4)
}
