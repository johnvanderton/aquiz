<template>
  <v-card class="pa-6" elevation="0" rounded="lg" border>
    <p class="section-title">Ajouter un questionnaire</p>
    <p class="section-sub mt-1">
      Chaque fichier .docx importé est sauvegardé dans la bibliothèque
      ci-dessous. Vous pourrez ensuite en activer un seul pour le quizz public.
    </p>

    <v-sheet
      class="dropzone mt-5"
      :class="{ 'dropzone--active': dragActive }"
      rounded="lg"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="onDrop"
      @click="picker?.click()"
    >
      <v-icon icon="mdi-tray-arrow-up" size="32" color="primary" />
      <p class="dropzone-text mt-2">
        Glissez un ou plusieurs fichiers .docx, ou
        <span class="link">parcourez vos fichiers</span>
      </p>
      <input
        ref="picker"
        type="file"
        accept=".docx"
        multiple
        class="hidden-input"
        @change="onPick"
      />
    </v-sheet>

    <v-progress-linear v-if="loading" indeterminate color="secondary" class="mt-4" rounded />

    <v-alert
      v-for="(msg, i) in messages"
      :key="i"
      :type="msg.type"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      closable
      @click:close="messages.splice(i, 1)"
    >
      {{ msg.text }}
    </v-alert>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { parseDocxQuiz } from '@/utils/docxParser'
import { getIdbLastErrorMessage } from '@/utils/idbKeyval'

const library = useLibraryStore()
const picker = ref(null)
const dragActive = ref(false)
const loading = ref(false)
const messages = ref([])

async function onPick(e) {
  const files = Array.from(e.target.files || [])
  await handleFiles(files)
  e.target.value = ''
}

async function onDrop(e) {
  dragActive.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  await handleFiles(files)
}

async function handleFiles(files) {
  const docxFiles = files.filter((f) => f.name.toLowerCase().endsWith('.docx'))
  if (docxFiles.length === 0) {
    messages.value.unshift({ type: 'error', text: 'Merci de sélectionner un ou plusieurs fichiers .docx.' })
    return
  }

  loading.value = true
  for (const file of docxFiles) {
    try {
      const questions = await parseDocxQuiz(file)
      if (questions.length === 0) {
        messages.value.unshift({
          type: 'error',
          text: `« ${file.name} » : aucune question détectée, vérifiez le format du document.`
        })
        continue
      }
      const created = await library.addFile(file.name, questions)
      if (!created) {
        const detail = getIdbLastErrorMessage()
        messages.value.unshift({
          type: 'error',
          text: `« ${file.name} » : échec de l'enregistrement (stockage indisponible ou saturé).${detail ? ` Détail technique : ${detail}` : ''}`
        })
        continue
      }
      messages.value.unshift({
        type: 'success',
        text: `« ${file.name} » enregistré (${questions.length} question(s)).`
      })
    } catch (err) {
      console.error(err)
      messages.value.unshift({ type: 'error', text: `« ${file.name} » : lecture impossible.` })
    }
  }
  loading.value = false
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

.dropzone {
  border: 1.5px dashed rgba(34, 49, 79, 0.35);
  padding: 2rem 1.25rem;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  background-color: rgba(34, 49, 79, 0.02);
}

.dropzone:hover,
.dropzone--active {
  border-color: rgb(var(--v-theme-accent));
  background-color: rgba(201, 123, 63, 0.06);
}

.dropzone-text {
  color: rgb(var(--v-theme-primary));
  font-size: 0.92rem;
}

.link {
  color: rgb(var(--v-theme-accent));
  text-decoration: underline;
}

.hidden-input {
  display: none;
}
</style>
