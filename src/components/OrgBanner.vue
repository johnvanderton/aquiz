<template>
  <div v-if="vendors.active" class="org-banner">
    <img v-if="vendors.active.imageDataUrl" :src="vendors.active.imageDataUrl" alt="" class="org-banner-img" />
    <span v-if="vendors.active.name" class="org-banner-name">{{ vendors.active.name }}</span>
  </div>
</template>

<script setup>
import { useVendorsStore } from '@/stores/vendors'

const vendors = useVendorsStore()
</script>

<style scoped>
.org-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  margin-bottom: 2rem;
  text-align: center;
}

.org-banner-img {
  height: 180px;
  max-width: 100%;
  width: auto;
  object-fit: contain;
  border-radius: 12px;
}

.org-banner-name {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.4rem;
  color: rgb(var(--v-theme-primary));
}
</style>
