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
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15),
                0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .quiz-banner-img {
    width: 100%;
    height: auto;
    display: block;
  }

</style>
