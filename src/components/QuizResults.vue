<template>
  <v-container max-width="760" class="py-8">
    <QuizBanner />
    <v-card class="score-card pa-8 text-center" elevation="0" rounded="lg">
      <p class="eyebrow">Résultat</p>
      <h1 class="score-number">{{ store.score.correct }} / {{ store.score.total }}</h1>
      <p class="score-percent">{{ store.score.percent }}% de bonnes réponses</p>

      <v-chip
        :color="levelInfo.color"
        variant="flat"
        size="large"
        class="mt-4 level-chip"
        :prepend-icon="levelInfo.icon"
      >
        {{ levelInfo.label }}
      </v-chip>

      <v-progress-linear
        :model-value="store.score.percent"
        :color="levelInfo.color"
        bg-color="surface-variant"
        height="8"
        rounded
        class="mt-5"
      />
      <p class="score-message mt-4">{{ scoreMessage }}</p>

      <div class="d-flex justify-center ga-3 mt-6 flex-wrap">
        <v-btn variant="flat" color="accent" prepend-icon="mdi-file-pdf-box" @click="downloadPdf">
          Télécharger en PDF
        </v-btn>
        <v-btn
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-information-outline"
          @click="goToContact"
        >
          Plus d'informations
        </v-btn>
        <v-btn variant="tonal" color="primary" prepend-icon="mdi-restart" @click="restart">
          Recommencer ce quizz
        </v-btn>
      </div>
    </v-card>

    <h3 class="review-title mt-10 mb-4">Détail des réponses</h3>

    <v-card
      v-for="(r, idx) in store.results"
      :key="r.question.id"
      class="review-card mb-4 pa-5"
      :class="r.isCorrect ? 'review-card--ok' : 'review-card--ko'"
      elevation="0"
      rounded="lg"
      border
    >
      <div class="d-flex align-start ga-3">
        <v-icon
          :icon="r.isCorrect ? 'mdi-check-circle' : 'mdi-close-circle'"
          :color="r.isCorrect ? 'success' : 'error'"
          size="26"
          class="mt-1"
        />
        <div class="flex-grow-1">
          <p class="review-question">{{ idx + 1 }}. {{ r.question.text }}</p>

          <ul class="review-options mt-2">
            <li
              v-for="option in r.question.options"
              :key="option.id"
              :class="optionClass(r, option)"
            >
              <v-icon
                v-if="option.correct"
                icon="mdi-check"
                size="16"
                color="success"
                class="mr-1"
              />
              <v-icon
                v-else-if="wasSelectedWrong(r, option)"
                icon="mdi-close"
                size="16"
                color="error"
                class="mr-1"
              />
              {{ option.text }}
              <span v-if="option.correct" class="tag tag--right">bonne réponse</span>
              <span v-if="wasSelectedWrong(r, option)" class="tag tag--wrong">votre réponse</span>
            </li>
          </ul>
        </div>
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useQuizStore } from '@/stores/quiz'
import { useLibraryStore, LEVELS } from '@/stores/library'
import { useVendorsStore } from '@/stores/vendors'
import { exportResultsToPdf } from '@/utils/pdfExport'
import QuizBanner from '@/components/QuizBanner.vue'

const emit = defineEmits(['restart', 'more-info'])

const store = useQuizStore()
const library = useLibraryStore()
const vendors = useVendorsStore()

const levelKey = computed(() => library.levelFor(store.score.percent))
const levelInfo = computed(() => LEVELS[levelKey.value])

const scoreMessage = computed(() => {
  const messages = {
    parfait: 'Sans faute ! Excellent travail.',
    eleve: 'Très bon résultat.',
    moyen: 'Pas mal, mais il reste des points à revoir.',
    faible: 'Revoyez les points ci-dessous avant de retenter le quizz.'
  }
  return messages[levelKey.value]
})

function isSelected(result, optionId) {
  const given = result.given
  return Array.isArray(given) ? given.includes(optionId) : given === optionId
}

function wasSelectedWrong(result, option) {
  return isSelected(result, option) && !option.correct
}

function optionClass(result, option) {
  if (option.correct) return 'is-correct'
  if (wasSelectedWrong(result, option)) return 'is-wrong'
  return ''
}

async function downloadPdf() {
  await exportResultsToPdf({
    fileName: store.fileName,
    vendorLogoDataUrl: vendors.active?.imageDataUrl || '',
    score: store.score,
    level: levelInfo.value,
    results: store.results
  })
}

function restart() {
  emit('restart')
}

// Renvoie vers le formulaire de contact : le PDF des résultats y sera
// automatiquement proposé en pièce jointe (voir ContactView.vue).
function goToContact() {
  emit('more-info')
}
</script>

<style scoped>
.eyebrow {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-secondary));
  font-weight: 600;
}

.score-card {
  border: 1.5px solid rgba(34, 49, 79, 0.12);
  background: linear-gradient(180deg, #ffffff 0%, #f9f8f4 100%);
}

.score-number {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 3.2rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  line-height: 1.1;
  margin-top: 0.25rem;
}

.score-percent {
  color: #5b5f6b;
  margin-top: 0.25rem;
}

.level-chip {
  font-weight: 700;
  letter-spacing: 0.02em;
}

.score-message {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.review-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  font-size: 1.15rem;
}

.review-card {
  border-width: 1.5px;
}

.review-card--ok {
  border-color: rgba(62, 122, 92, 0.35);
}

.review-card--ko {
  border-color: rgba(180, 72, 47, 0.35);
}

.review-question {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  font-size: 1rem;
}

.review-options {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.review-options li {
  font-size: 0.92rem;
  color: #4a4e58;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.is-correct {
  color: rgb(var(--v-theme-success));
  font-weight: 600;
}

.is-wrong {
  color: rgb(var(--v-theme-error));
  text-decoration: line-through;
}

.tag {
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  margin-left: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.tag--wrong {
  background: rgba(180, 72, 47, 0.12);
  color: rgb(var(--v-theme-error));
}

.tag--right {
  background: rgba(62, 122, 92, 0.12);
  color: rgb(var(--v-theme-success));
}
</style>
