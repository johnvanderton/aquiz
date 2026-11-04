<template>
  <div v-if="quizBanners.active?.imageDataUrl" class="quiz-banner">
    <img :src="quizBanners.active.imageDataUrl" alt="" class="quiz-banner-img" />
  </div>
</template>

<script setup>
import { useQuizBannersStore } from '@/stores/quizBanners'

const quizBanners = useQuizBannersStore()
</script>

<style scoped>
.quiz-banner {
  margin-bottom: 1.75rem;
  border-radius: 12px;
  overflow: hidden;
}

.quiz-banner-img {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  display: block;
  border-radius: 12px;
}
</style>
