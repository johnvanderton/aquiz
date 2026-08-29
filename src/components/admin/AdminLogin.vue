<template>
  <v-container class="fill-height" max-width="420">
    <v-responsive class="mx-auto" width="100%">
      <v-card class="pa-8" elevation="0" rounded="lg" border>
        <v-icon icon="mdi-shield-account-outline" size="34" color="primary" class="mb-3" />
        <h1 class="login-title">Espace administration</h1>
        <p class="login-sub mt-1">Connectez-vous pour gérer les questionnaires.</p>

        <v-form class="mt-6" @submit.prevent="submit">
          <v-text-field
            v-model="username"
            label="Identifiant"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-account-outline"
            autofocus
          />
          <v-text-field
            v-model="password"
            label="Mot de passe"
            type="password"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-lock-outline"
            class="mt-2"
          />

          <v-alert v-if="auth.loginError" type="error" variant="tonal" density="comfortable" class="mt-2">
            {{ auth.loginError }}
          </v-alert>

          <v-btn type="submit" color="primary" variant="flat" block class="mt-4">
            Se connecter
          </v-btn>
        </v-form>
      </v-card>
    </v-responsive>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const username = ref('')
const password = ref('')

async function submit() {
  await auth.login(username.value.trim(), password.value)
}
</script>

<style scoped>
.login-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.3rem;
  color: rgb(var(--v-theme-primary));
}

.login-sub {
  color: #5b5f6b;
  font-size: 0.9rem;
}
</style>
