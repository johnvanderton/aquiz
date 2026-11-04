<template>
  <QuizResults v-if="quiz.status === 'finished'" @restart="onRestart" @more-info="onMoreInfo" />

  <v-container v-else class="fill-height" max-width="560">
    <v-responsive class="mx-auto text-center">
      <v-icon icon="mdi-information-outline" size="48" color="secondary" class="mb-4" />
      <h1 class="empty-title">Aucun résultat à afficher</h1>
      <p class="empty-text mt-3">
        Vous n'avez pas encore terminé de quizz durant cette session.
      </p>
      <v-btn color="primary" variant="flat" class="mt-6" to="/">
        Aller au quizz
      </v-btn>
    </v-responsive>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'
import QuizResults from '@/components/QuizResults.vue'

const quiz = useQuizStore()
const router = useRouter()

function onRestart() {
  quiz.restart()
  router.push('/')
}

// "Plus d'informations" renvoie vers le formulaire de contact. Le quizz
// reste "finished" en mémoire (le store n'est pas réinitialisé) afin que
// ContactView puisse proposer automatiquement le PDF de résultat en pièce
// jointe.
function onMoreInfo() {
  router.push('/contact')
}
</script>

<style scoped>
.empty-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.4rem;
  color: rgb(var(--v-theme-primary));
}

.empty-text {
  color: #5b5f6b;
}
</style>
