<template>
  <v-container max-width="560" class="py-10">
    <OrgBanner />

    <p class="eyebrow text-center">Nous contacter</p>
    <h1 class="page-title text-center mt-1">Formulaire de contact</h1>
    <p class="page-sub text-center mt-2">
      Une question sur le quizz ou envie d'être accompagné(e) ? Laissez-nous
      un message.
    </p>

    <v-card class="pa-6 pa-md-8 mt-8" elevation="0" rounded="lg" border>
      <v-alert v-if="submitted" type="success" variant="tonal" density="comfortable" class="mb-6">
        Merci {{ lastSubmittedName }}, votre message
        <template v-if="lastSubmittedHadAttachment">(avec vos résultats joints) </template>
        a bien été enregistré. Nous reviendrons vers vous rapidement.
      </v-alert>

      <v-form v-else @submit.prevent="submit">
        <!-- Pièce jointe automatique du résultat de quizz -->
        <v-sheet
          v-if="hasResult"
          class="attachment-card mb-6 pa-4"
          rounded="lg"
        >
          <div class="d-flex align-center ga-3">
            <v-icon icon="mdi-file-pdf-box" color="accent" size="30" />
            <div class="flex-grow-1">
              <p class="attachment-title">Résultats de votre quizz joints</p>
              <p class="attachment-filename">
                {{ attachmentLoading ? 'Préparation du document…' : (attachment?.filename || 'Indisponible') }}
              </p>
            </div>
            <v-progress-circular v-if="attachmentLoading" indeterminate size="22" color="accent" />
            <v-btn
              v-else-if="attachment"
              size="small"
              variant="text"
              color="primary"
              prepend-icon="mdi-eye-outline"
              @click="previewAttachment"
            >
              Aperçu
            </v-btn>
          </div>
          <v-alert
            v-if="attachmentError"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="mt-3"
          >
            {{ attachmentError }} Votre message pourra tout de même être envoyé, sans le PDF joint.
          </v-alert>
        </v-sheet>

        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.firstName"
              label="Prénom"
              variant="outlined"
              density="comfortable"
              required
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.lastName"
              label="Nom"
              variant="outlined"
              density="comfortable"
              required
            />
          </v-col>
        </v-row>

        <v-text-field
          v-model="form.email"
          label="Email"
          type="email"
          variant="outlined"
          density="comfortable"
          required
        />

        <v-textarea
          v-model="form.question"
          label="Votre question"
          variant="outlined"
          density="comfortable"
          rows="4"
          required
        />

        <v-checkbox v-model="form.rgpd" color="primary" class="mt-1" required>
          <template #label>
            <span class="rgpd-label">
              J'accepte que mes données soient utilisées pour traiter ma
              demande, conformément à la réglementation RGPD.
            </span>
          </template>
        </v-checkbox>

        <v-alert v-if="error" type="error" variant="tonal" density="comfortable" class="mb-4">
          {{ error }}
        </v-alert>

        <v-btn
          type="submit"
          color="primary"
          variant="flat"
          block
          prepend-icon="mdi-send-outline"
          :loading="submitting"
        >
          Envoyer ma demande
        </v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>

<script setup>
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue'
import { useContactMessagesStore } from '@/stores/contactMessages'
import { useQuizStore } from '@/stores/quiz'
import { useLibraryStore, LEVELS } from '@/stores/library'
import { useVendorsStore } from '@/stores/vendors'
import { getResultsPdfBlob, blobToDataUrl } from '@/utils/pdfExport'
import { getIdbLastErrorMessage } from '@/utils/idbKeyval'
import OrgBanner from '@/components/OrgBanner.vue'

const messagesStore = useContactMessagesStore()
const quiz = useQuizStore()
const library = useLibraryStore()
const vendors = useVendorsStore()

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  question: '',
  rgpd: false
})

const error = ref('')
const submitting = ref(false)
const submitted = ref(false)
const lastSubmittedName = ref('')
const lastSubmittedHadAttachment = ref(false)

// Si l'utilisateur arrive ici juste après avoir terminé un quizz (bouton
// "Plus d'informations"), on propose automatiquement ses résultats en
// pièce jointe.
const hasResult = quiz.status === 'finished' && quiz.total > 0
const attachment = ref(null) // { blob, filename, previewUrl }
const attachmentLoading = ref(false)
const attachmentError = ref('')

onMounted(async () => {
  if (!hasResult) return
  attachmentLoading.value = true
  try {
    const levelKey = library.levelFor(quiz.score.percent)
    const { blob, filename } = await getResultsPdfBlob({
      fileName: quiz.fileName,
      vendorLogoDataUrl: vendors.active?.imageDataUrl || '',
      score: quiz.score,
      level: LEVELS[levelKey],
      results: quiz.results
    })
    attachment.value = { blob, filename, previewUrl: URL.createObjectURL(blob) }
  } catch (err) {
    console.error(err)
    attachmentError.value = 'Le PDF de vos résultats n’a pas pu être préparé.'
  } finally {
    attachmentLoading.value = false
  }
})

onBeforeUnmount(() => {
  if (attachment.value?.previewUrl) URL.revokeObjectURL(attachment.value.previewUrl)
})

function previewAttachment() {
  if (attachment.value?.previewUrl) window.open(attachment.value.previewUrl, '_blank')
}

async function submit() {
  error.value = ''

  if (!form.firstName || !form.lastName || !form.email || !form.question) {
    error.value = 'Merci de renseigner tous les champs.'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    error.value = 'Merci de saisir une adresse email valide.'
    return
  }
  if (!form.rgpd) {
    error.value = "Merci d'accepter le traitement de vos données (RGPD) pour envoyer votre demande."
    return
  }

  submitting.value = true
  try {
    let attachmentPayload = null
    if (attachment.value) {
      try {
        const dataUrl = await blobToDataUrl(attachment.value.blob)
        attachmentPayload = { filename: attachment.value.filename, dataUrl }
      } catch (err) {
        console.error(err)
        // On n'empêche pas l'envoi du message si la pièce jointe échoue à
        // se préparer : elle sera simplement absente.
      }
    }

    const created = await messagesStore.addMessage({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      question: form.question,
      attachment: attachmentPayload
    })

    if (!created) {
      const detail = getIdbLastErrorMessage()
      error.value =
        "Échec de l'enregistrement : stockage indisponible ou saturé. Réessayez sans pièce jointe, ou videz les données locales dans Admin > Identifiants." +
        (detail ? ` Détail technique : ${detail}` : '')
      return
    }

    lastSubmittedName.value = form.firstName
    lastSubmittedHadAttachment.value = !!attachmentPayload
    submitted.value = true

    form.firstName = ''
    form.lastName = ''
    form.email = ''
    form.question = ''
    form.rgpd = false
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.eyebrow {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
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

.page-sub {
  color: #5b5f6b;
}

.rgpd-label {
  font-size: 0.85rem;
  color: #4a4e58;
  line-height: 1.4;
}

.attachment-card {
  border: 1.5px solid rgba(201, 123, 63, 0.35);
  background-color: rgba(201, 123, 63, 0.06);
}

.attachment-title {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  font-size: 0.92rem;
}

.attachment-filename {
  font-size: 0.82rem;
  color: #5b5f6b;
}
</style>
