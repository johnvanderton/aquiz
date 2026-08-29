<template>
  <v-card class="pa-6" elevation="0" rounded="lg" border>
    <p class="section-title">Bibliothèque de questionnaires</p>
    <p class="section-sub mt-1">
      Un seul fichier peut être actif à la fois : c'est celui-ci qui sera
      proposé aux utilisateurs sur la page publique du quizz.
    </p>

    <v-alert
      v-if="library.files.length === 0"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mt-5"
    >
      Aucun fichier enregistré pour le moment.
    </v-alert>

    <v-list v-else class="mt-4" lines="two">
      <v-list-item
        v-for="file in library.files"
        :key="file.id"
        class="file-item mb-2"
        :class="{ 'file-item--active': file.id === library.activeId }"
        rounded="lg"
        border
      >
        <template #prepend>
          <v-icon
            :icon="file.id === library.activeId ? 'mdi-check-circle' : 'mdi-file-word-outline'"
            :color="file.id === library.activeId ? 'success' : 'primary'"
          />
        </template>

        <v-list-item-title class="file-name">{{ file.name }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ file.questions.length }} question(s) — importé le {{ formatDate(file.uploadedAt) }}
        </v-list-item-subtitle>

        <template #append>
          <v-chip v-if="file.id === library.activeId" color="success" size="small" variant="flat" class="mr-2">
            Publié
          </v-chip>
          <v-btn
            v-else
            size="small"
            variant="tonal"
            color="primary"
            class="mr-2"
            @click="library.setActive(file.id)"
          >
            Publier
          </v-btn>
          <v-btn
            v-if="file.id === library.activeId"
            size="small"
            variant="outlined"
            color="secondary"
            class="mr-2"
            @click="library.clearActive()"
          >
            Dépublier
          </v-btn>
          <v-btn
            size="small"
            variant="text"
            color="error"
            icon="mdi-trash-can-outline"
            @click="confirmDelete(file)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="dialog-title">Supprimer ce fichier ?</v-card-title>
        <v-card-text>
          « {{ toDelete?.name }} » sera définitivement retiré de la bibliothèque.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Annuler</v-btn>
          <v-btn color="error" variant="flat" @click="doDelete">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/library'

const library = useLibraryStore()
const deleteDialog = ref(false)
const toDelete = ref(null)

function confirmDelete(file) {
  toDelete.value = file
  deleteDialog.value = true
}

function doDelete() {
  if (toDelete.value) library.removeFile(toDelete.value.id)
  deleteDialog.value = false
  toDelete.value = null
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
}

.file-item {
  border-color: rgba(34, 49, 79, 0.14) !important;
}

.file-item--active {
  border-color: rgba(62, 122, 92, 0.4) !important;
  background-color: rgba(62, 122, 92, 0.05);
}

.file-name {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.dialog-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
}
</style>
