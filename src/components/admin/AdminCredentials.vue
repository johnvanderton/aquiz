<template>
  <div>
    <v-card class="pa-6" elevation="0" rounded="lg" border>
      <p class="section-title">Changer le mot de passe</p>
      <p class="section-sub mt-1">
        Le mot de passe n'est jamais stocké en clair : seule son empreinte
        SHA-256 est conservée.
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
    </v-card>

    <v-card class="pa-6 mt-6" elevation="0" rounded="lg" border>
      <p class="section-title">Stockage local</p>
      <p class="section-sub mt-1">
        Questionnaires, bannières et messages (avec leurs pièces jointes)
        sont stockés dans <strong>IndexedDB</strong>, dont le quota dépend
        de l'espace disque disponible sur l'appareil — généralement bien
        plus large que l'ancien stockage par <code>localStorage</code>
        (quelques Mo seulement). Un message de stockage plein reste
        possible sur un appareil dont le disque est presque saturé ; dans
        ce cas, videz les données ci-dessous ou supprimez d'anciens
        éléments (fichiers, bannières).
      </p>

      <p class="field-label mt-4 mb-2">État d'IndexedDB</p>
      <v-chip :color="idbAvailable ? 'success' : 'error'" variant="tonal">
        {{ idbAvailable ? 'Disponible et fonctionnel' : 'Indisponible dans ce navigateur/contexte' }}
      </v-chip>
      <p v-if="!idbAvailable" class="field-hint mt-2">
        IndexedDB peut être bloqué par la navigation privée de certains
        navigateurs, un paramètre de confidentialité, ou l'exécution depuis
        un fichier local (<code>file://</code>) plutôt qu'un vrai serveur
        (<code>http://</code>/<code>https://</code>). Servez l'application
        via <code>npm run dev</code> ou un hébergement web pour résoudre ce
        cas.
      </p>

      <template v-if="usage.supported">
        <p class="field-label mt-5 mb-2">Espace utilisé sur ce site (approximatif)</p>
        <v-chip variant="tonal" color="primary">
          {{ formatBytes(usage.usage) }} / {{ formatBytes(usage.quota) }}
        </v-chip>
        <v-progress-linear
          :model-value="usagePercent"
          color="primary"
          bg-color="surface-variant"
          height="6"
          rounded
          class="mt-3"
        />
      </template>
      <v-alert v-else type="info" variant="tonal" density="comfortable" class="mt-4">
        L'estimation du stockage n'est pas prise en charge par ce navigateur.
      </v-alert>

      <v-alert v-if="cleared" type="success" variant="tonal" density="comfortable" class="mt-4">
        Toutes les données locales de l'application ont été supprimées.
      </v-alert>

      <div class="mt-4">
        <v-btn color="error" variant="outlined" prepend-icon="mdi-delete-sweep-outline" @click="clearDialog = true">
          Vider toutes les données locales
        </v-btn>
      </div>
    </v-card>

    <v-dialog v-model="clearDialog" max-width="460">
      <v-card rounded="lg">
        <v-card-title class="dialog-title">Vider toutes les données locales ?</v-card-title>
        <v-card-text>
          Cette action supprime définitivement tous les questionnaires,
          bannières, messages de contact et seuils enregistrés dans ce
          navigateur. Le mot de passe admin repasse également à sa valeur
          par défaut. Cette action est irréversible.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="clearDialog = false">Annuler</v-btn>
          <v-btn color="error" variant="flat" :loading="clearing" @click="doClearStorage">Tout supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getAppStorageEstimate, formatBytes, clearAppStorage } from '@/utils/storageUsage'
import { isIdbAvailable } from '@/utils/idbKeyval'

const auth = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const formError = ref('')

const currentHostname = typeof window !== 'undefined' ? window.location.hostname : ''
const domains = ref([...auth.allowedDomains])
const newDomain = ref('')
const domainsSaved = ref(false)

const usage = ref({ usage: 0, quota: 0, supported: false })
const usagePercent = computed(() => (usage.value.quota > 0 ? (usage.value.usage / usage.value.quota) * 100 : 0))
const idbAvailable = ref(true)
const clearDialog = ref(false)
const clearing = ref(false)
const cleared = ref(false)

onMounted(async () => {
  usage.value = await getAppStorageEstimate()
  idbAvailable.value = await isIdbAvailable()
})

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
  const value = newDomain.value.trim()
  if (!value) return
  if (!domains.value.includes(value)) domains.value.push(value)
  newDomain.value = ''
}

function removeDomain(domain) {
  domains.value = domains.value.filter((d) => d !== domain)
}

function saveDomains() {
  auth.setAllowedDomains(domains.value)
  domainsSaved.value = true
  setTimeout(() => (domainsSaved.value = false), 2000)
}

async function doClearStorage() {
  clearing.value = true
  await clearAppStorage()
  clearing.value = false
  clearDialog.value = false
  cleared.value = true
  // On recharge la page pour repartir sur des stores propres (Pinia garde
  // sinon en mémoire les anciennes valeurs jusqu'au prochain rechargement).
  setTimeout(() => window.location.reload(), 800)
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
