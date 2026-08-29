<template>
  <!-- Aucun quizz publié par l'administrateur -->
  <v-container v-if="!library.activeFile" class="fill-height" max-width="560">
    <v-responsive class="mx-auto text-center">
      <QuizBanner />
      <v-icon icon="mdi-file-question-outline" size="52" color="secondary" class="mb-4" />
      <h1 class="unavailable-title">Quizz non disponible</h1>
      <p class="unavailable-text mt-3">
        Aucun questionnaire n'a été publié pour le moment. Revenez un peu
        plus tard, ou contactez l'administrateur du site.
      </p>
    </v-responsive>
  </v-container>

  <!-- Quizz en cours -->
  <QuizPlayer v-else-if="quiz.status === 'ready'" />

  <!-- Redirection en cours vers la page résultats -->
  <v-container v-else class="fill-height" max-width="560">
    <v-progress-circular indeterminate color="secondary" class="mx-auto d-block" />
  </v-container>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { useQuizStore } from '@/stores/quiz'
import QuizPlayer from '@/components/QuizPlayer.vue'
import QuizBanner from '@/components/QuizBanner.vue'

const library = useLibraryStore()
const quiz = useQuizStore()
const router = useRouter()

function loadActiveQuiz() {
  if (!library.activeFile) return
  quiz.setQuestions(library.activeFile.questions, library.activeFile.name)
}

onMounted(loadActiveQuiz)

watch(() => library.activeId, loadActiveQuiz)

watch(
  () => quiz.status,
  (status) => {
    if (status === 'finished') router.push('/resultats')
  }
)
</script>

<style scoped>
.unavailable-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.6rem;
  color: rgb(var(--v-theme-primary));
}

.unavailable-text {
  color: #5b5f6b;
  line-height: 1.55;
}
</style>
