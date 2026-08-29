<template>
  <AdminLogin v-if="!auth.isAuthenticated" />

  <v-container v-else max-width="860" class="py-8">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <p class="eyebrow">Administration</p>
        <h1 class="page-title">Gestion du quizz</h1>
      </div>
      <v-btn variant="text" color="secondary" prepend-icon="mdi-logout" @click="auth.logout()">
        Déconnexion
      </v-btn>
    </div>

    <v-tabs v-model="tab" color="primary" class="mb-6" show-arrows>
      <v-tab value="files">Questionnaires</v-tab>
      <v-tab value="levels">Niveaux de score</v-tab>
      <v-tab value="banners">Bannières</v-tab>
      <v-tab value="messages">Messages</v-tab>
      <v-tab value="credentials">Identifiants</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="files">
        <AdminUploader class="mb-6" />
        <AdminFileList />
      </v-window-item>

      <v-window-item value="levels">
        <AdminThresholds />
      </v-window-item>

      <v-window-item value="banners">
        <AdminVendorBanners class="mb-6" />
        <AdminQuizBanners />
      </v-window-item>

      <v-window-item value="messages">
        <AdminMessages />
      </v-window-item>

      <v-window-item value="credentials">
        <AdminCredentials />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AdminLogin from '@/components/admin/AdminLogin.vue'
import AdminUploader from '@/components/admin/AdminUploader.vue'
import AdminFileList from '@/components/admin/AdminFileList.vue'
import AdminThresholds from '@/components/admin/AdminThresholds.vue'
import AdminVendorBanners from '@/components/admin/AdminVendorBanners.vue'
import AdminQuizBanners from '@/components/admin/AdminQuizBanners.vue'
import AdminMessages from '@/components/admin/AdminMessages.vue'
import AdminCredentials from '@/components/admin/AdminCredentials.vue'

const auth = useAuthStore()
const tab = ref('files')
</script>

<style scoped>
.eyebrow {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-secondary));
  font-weight: 600;
}

.page-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  color: rgb(var(--v-theme-primary));
}
</style>
