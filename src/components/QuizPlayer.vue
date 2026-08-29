<template>
  <v-container max-width="720" class="py-8">
    <QuizBanner />
    <div class="d-flex align-center justify-space-between mb-2">
      <p class="progress-label">
        Question {{ currentIndex + 1 }} / {{ store.total }}
      </p>
      <p class="progress-label">{{ store.answeredCount }} répondue(s)</p>
    </div>
    <v-progress-linear
      :model-value="progressPercent"
      color="secondary"
      bg-color="surface-variant"
      height="6"
      rounded
      class="mb-8"
    />

    <v-card class="pa-6 pa-md-8" elevation="0" rounded="lg" border>
      <p class="question-eyebrow">
        {{ currentQuestion.multiple ? 'Plusieurs réponses possibles' : 'Une seule réponse' }}
      </p>
      <h2 class="question-text">{{ currentQuestion.text }}</h2>

      <v-radio-group
        v-if="!currentQuestion.multiple"
        :model-value="store.answers[currentQuestion.id]"
        class="mt-6"
        @update:model-value="(val) => store.setAnswerSingle(currentQuestion.id, val)"
      >
        <v-sheet
          v-for="option in currentQuestion.options"
          :key="option.id"
          class="option-row mb-3"
          :class="{ 'option-row--selected': store.answers[currentQuestion.id] === option.id }"
          rounded="lg"
          @click="store.setAnswerSingle(currentQuestion.id, option.id)"
        >
          <v-radio :value="option.id" color="accent" hide-details density="comfortable">
            <template #label>
              <span class="option-text">{{ option.text }}</span>
            </template>
          </v-radio>
        </v-sheet>
      </v-radio-group>

      <div v-else class="mt-6">
        <v-sheet
          v-for="option in currentQuestion.options"
          :key="option.id"
          class="option-row mb-3"
          :class="{ 'option-row--selected': isChecked(option.id) }"
          rounded="lg"
          @click="store.toggleAnswerMultiple(currentQuestion.id, option.id)"
        >
          <v-checkbox
            :model-value="isChecked(option.id)"
            color="accent"
            hide-details
            density="comfortable"
            @click.stop="store.toggleAnswerMultiple(currentQuestion.id, option.id)"
          >
            <template #label>
              <span class="option-text">{{ option.text }}</span>
            </template>
          </v-checkbox>
        </v-sheet>
      </div>
    </v-card>

    <div class="d-flex justify-space-between align-center mt-8">
      <v-btn
        variant="text"
        color="primary"
        prepend-icon="mdi-arrow-left"
        :disabled="currentIndex === 0"
        @click="currentIndex--"
      >
        Précédent
      </v-btn>

      <v-btn
        v-if="currentIndex < store.total - 1"
        color="primary"
        variant="flat"
        append-icon="mdi-arrow-right"
        @click="currentIndex++"
      >
        Suivant
      </v-btn>
      <v-btn
        v-else
        color="accent"
        variant="flat"
        append-icon="mdi-check-bold"
        :disabled="!store.isComplete"
        @click="store.submit()"
      >
        Voir mon score
      </v-btn>
    </div>

    <p v-if="currentIndex === store.total - 1 && !store.isComplete" class="hint mt-4 text-center">
      Répondez à toutes les questions pour valider le quizz.
    </p>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuizStore } from '@/stores/quiz'
import QuizBanner from '@/components/QuizBanner.vue'

const store = useQuizStore()
const currentIndex = ref(0)

const currentQuestion = computed(() => store.questions[currentIndex.value])
const progressPercent = computed(() =>
  store.total ? Math.round(((currentIndex.value + 1) / store.total) * 100) : 0
)

function isChecked(optionId) {
  const a = store.answers[currentQuestion.value.id]
  return Array.isArray(a) && a.includes(optionId)
}
</script>

<style scoped>
.progress-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.8rem;
  color: rgb(var(--v-theme-secondary));
  font-weight: 600;
  letter-spacing: 0.04em;
}

.question-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-accent));
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.question-text {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.4rem;
  color: rgb(var(--v-theme-primary));
  line-height: 1.4;
}

.option-row {
  border: 1.5px solid rgba(34, 49, 79, 0.14);
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.option-row:hover {
  border-color: rgba(34, 49, 79, 0.35);
}

.option-row--selected {
  border-color: rgb(var(--v-theme-accent));
  background-color: rgba(201, 123, 63, 0.07);
}

.option-text {
  color: #2b2f38;
  font-size: 0.98rem;
}

.hint {
  font-size: 0.85rem;
  color: #8a8d97;
}
</style>
