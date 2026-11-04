<template>
  <div>
    <v-card class="pa-6" elevation="0" rounded="lg" border>
      <p class="section-title">Changer le mot de passe</p>
      <p class="section-sub mt-1">
        Le mot de passe est vérifié côté serveur et n'est jamais stocké en
        clair : seule son empreinte (scrypt, avec sel) est conservée en base
        de données. Changer le mot de passe déconnecte les autres sessions
        ouvertes.
      </p>

      <v-form class="mt-4" @submit.prevent="submitPassword">
        <v-text-field
          v-model="currentPassword"
          label="Mot de passe actuel"
          type="password"
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          v-model="newPassword"
          label="Nouveau mot de passe"
          type="password"
          variant="outlined"
          density="comfortable"
          hint="6 caractères minimum"
          class="mt-2"
        />
        <v-text-field
          v-model="confirmPassword"
          label="Confirmer le nouveau mot de passe"
          type="password"
          variant="outlined"
          density="comfortable"
          class="mt-2"
        />

        <v-alert v-if="formError" type="error" variant="tonal" density="comfortable" class="mt-2">
          {{ formError }}
        </v-alert>
        <v-alert v-if="auth.passwordChangeSuccess" type="success" variant="tonal" density="comfortable" class="mt-2">
          Mot de passe mis à jour avec succès.
        </v-alert>

        <v-btn type="submit" color="primary" variant="flat" class="mt-4" prepend-icon="mdi-key-outline">
          Mettre à jour le mot de passe
        </v-btn>
      </v-form>
    </v-card>

    <v-card class="pa-6 mt-6" elevation="0" rounded="lg" border>
      <p class="section-title">Visibilité du menu Administration</p>
      <p class="section-sub mt-1">
        Le lien « Administration » n'apparaît dans le menu que sur les
        domaines listés ci-dessous (ex : <code>localhost</code>). L'URL
        <code>/admin</code> reste toujours accessible directement sur tout
        domaine, et toujours protégée par le login.
      </p>

      <p class="field-label mt-4 mb-2">Domaine actuel</p>
      <v-chip :color="auth.isCurrentDomainAllowed ? 'success' : 'warning'" variant="tonal">
        {{ currentHostname }} — {{ auth.isCurrentDomainAllowed ? 'menu visible' : 'menu masqué' }}
      </v-chip>

      <p class="field-label mt-5 mb-2">Domaines autorisés</p>
      <div class="d-flex flex-wrap ga-2 mb-3">
        <v-chip
          v-for="domain in domains"
          :key="domain"
          closable
          variant="tonal"
          color="primary"
          @click:close="removeDomain(domain)"
        >
          {{ domain }}
        </v-chip>
        <v-chip v-if="domains.length === 0" variant="tonal" color="warning">Aucun domaine autorisé</v-chip>
      </div>

      <div class="d-flex ga-2">
        <v-text-field
          v-model="newDomain"
          label="Ajouter un domaine (ex : brol.monsite.fr)"
          variant="outlined"
          density="comfortable"
          hide-details
          @keyup.enter="addDomain"
        />
        <v-btn color="primary" variant="tonal" @click="addDomain">Ajouter</v-btn>
      </div>

      <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save-outline" class="mt-4" @click="saveDomains">
        Enregistrer les domaines
      </v-btn>
      <v-scale-transition>
        <v-chip v-if="domainsSaved" color="success" variant="tonal" class="ml-3">Enregistré</v-chip>
      </v-scale-transition>
      <v-alert v-if="domainsError" type="error" variant="tonal" density="comfortable" class="mt-3">
        {{ domainsError }}
      </v-alert>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getLastApiError } from '@/utils/api'

const auth = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const formError = ref('')

const currentHostname = typeof window !== 'undefined' ? window.location.hostname : ''
const domains = ref([...auth.allowedDomains])
const newDomain = ref('')
const domainsSaved = ref(false)
const domainsError = ref('')

async function submitPassword() {
  formError.value = ''
  auth.passwordChangeSuccess = false

  if (newPassword.value !== confirmPassword.value) {
    formError.value = 'Les deux nouveaux mots de passe ne correspondent pas.'
    return
  }

  const ok = await auth.changePassword(currentPassword.value, newPassword.value)
  if (!ok) {
    formError.value = auth.passwordChangeError
    return
  }

  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

function addDomain() {
  const value = newDomain.value.trim().toLowerCase()
  if (!value) return
  if (!domains.value.includes(value)) domains.value.push(value)
  newDomain.value = ''
}

function removeDomain(domain) {
  domains.value = domains.value.filter((d) => d !== domain)
}

// Enregistré côté serveur (base SQLite) : la liste est donc la même pour
// tous les visiteurs et survit aux redémarrages.
async function saveDomains() {
  domainsError.value = ''
  const ok = await auth.setAllowedDomains(domains.value)
  if (!ok) {
    domainsError.value = getLastApiError() || "Échec de l'enregistrement."
    return
  }
  domains.value = [...auth.allowedDomains]
  domainsSaved.value = true
  setTimeout(() => (domainsSaved.value = false), 2000)
}
</script>

<style scoped>
.section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  font-size: 1.05rem;
}

.section-sub {
  color: #5b5f6b;
  font-size: 0.9rem;
  line-height: 1.5;
}

.field-label {
  font-size: 0.82rem;
  color: #5b5f6b;
  font-weight: 600;
}

.field-hint {
  font-size: 0.8rem;
  color: #8a8d97;
  line-height: 1.5;
}

.dialog-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
}
</style>
