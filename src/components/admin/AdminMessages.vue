<template>
  <v-card class="pa-6" elevation="0" rounded="lg" border>
    <div class="d-flex align-center justify-space-between">
      <div>
        <p class="section-title">Messages du formulaire de contact</p>
        <p class="section-sub mt-1">
          Ces messages proviennent du fichier plat local
          (<code>{{ storageKeyLabel }}</code>). Certains incluent le PDF de
          résultat du quizz joint automatiquement (bouton « Plus
          d'informations »), téléchargeable individuellement.
        </p>
      </div>
      <v-btn
        v-if="messagesStore.messages.length > 0"
        size="small"
        variant="text"
        color="error"
        prepend-icon="mdi-trash-can-outline"
        @click="clearAllDialog = true"
      >
        Tout supprimer
      </v-btn>
    </div>

    <v-alert v-if="messagesStore.messages.length === 0" type="info" variant="tonal" density="comfortable" class="mt-5">
      Aucun message reçu pour le moment.
    </v-alert>

    <v-card
      v-for="msg in messagesStore.messages"
      :key="msg.id"
      class="message-card mt-4 pa-4"
      elevation="0"
      rounded="lg"
      border
    >
      <div class="d-flex align-start justify-space-between">
        <div>
          <p class="message-name">{{ msg.firstName }} {{ msg.lastName }}</p>
          <p class="message-email">{{ msg.email }}</p>
        </div>
        <div class="d-flex align-center ga-2">
          <span class="message-date">{{ formatDate(msg.submittedAt) }}</span>
          <v-btn
            size="small"
            variant="text"
            color="error"
            icon="mdi-trash-can-outline"
            @click="confirmDelete(msg)"
          />
        </div>
      </div>
      <p class="message-question mt-3">{{ msg.question }}</p>

      <div v-if="msg.attachment" class="attachment-row mt-3">
        <v-icon icon="mdi-file-pdf-box" color="accent" size="20" class="mr-2" />
        <span class="attachment-filename">{{ msg.attachment.filename }}</span>
        <v-btn
          size="small"
          variant="text"
          color="primary"
          prepend-icon="mdi-download-outline"
          class="ml-2"
          @click="downloadAttachment(msg.attachment)"
        >
          Télécharger
        </v-btn>
      </div>
    </v-card>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="dialog-title">Supprimer ce message ?</v-card-title>
        <v-card-text>
          Le message de « {{ toDelete?.firstName }} {{ toDelete?.lastName }} » sera
          définitivement supprimé.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Annuler</v-btn>
          <v-btn color="error" variant="flat" @click="doDelete">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="clearAllDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="dialog-title">Vider tous les messages ?</v-card-title>
        <v-card-text>
          Les {{ messagesStore.messages.length }} message(s) enregistré(s) seront
          définitivement supprimés.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="clearAllDialog = false">Annuler</v-btn>
          <v-btn color="error" variant="flat" @click="doClearAll">Tout supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useContactMessagesStore } from '@/stores/contactMessages'

const messagesStore = useContactMessagesStore()
const storageKeyLabel = 'quiz_contact_messages_v1'

const deleteDialog = ref(false)
const clearAllDialog = ref(false)
const toDelete = ref(null)

function confirmDelete(msg) {
  toDelete.value = msg
  deleteDialog.value = true
}

function doDelete() {
  if (toDelete.value) messagesStore.removeMessage(toDelete.value.id)
  deleteDialog.value = false
  toDelete.value = null
}

function doClearAll() {
  messagesStore.clearAll()
  clearAllDialog.value = false
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function downloadAttachment(attachment) {
  const a = document.createElement('a')
  a.href = attachment.dataUrl
  a.download = attachment.filename || 'resultat.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
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

.message-card {
  border-color: rgba(34, 49, 79, 0.14);
}

.message-name {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.message-email {
  font-size: 0.85rem;
  color: #5b5f6b;
}

.message-date {
  font-size: 0.75rem;
  color: #8a8d97;
  white-space: nowrap;
}

.message-question {
  font-size: 0.92rem;
  color: #2b2f38;
  white-space: pre-wrap;
}

.attachment-row {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(201, 123, 63, 0.3);
  background-color: rgba(201, 123, 63, 0.06);
  border-radius: 8px;
}

.attachment-filename {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.dialog-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
}
</style>
