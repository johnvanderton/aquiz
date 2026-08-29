<template>
  <v-card class="pa-6" elevation="0" rounded="lg" border>
    <p class="section-title">Bannières du quizz</p>
    <p class="section-sub mt-1">
      Créez une bannière par quizz (titre et/ou image). Une seule est active
      à la fois : elle s'affiche en en-tête de la page publique du quizz.
    </p>

    <!-- Formulaire d'ajout -->
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="form.title"
          label="Titre de la bannière"
          placeholder="Ex : Testez vos connaissances en assurance"
          variant="outlined"
          density="comfortable"
        />
        <div class="d-flex align-center ga-3 mt-2">
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-image-outline" @click="picker?.click()">
            {{ form.imageDataUrl ? "Changer l'image" : 'Ajouter une image' }}
          </v-btn>
          <v-btn
            v-if="form.imageDataUrl"
            variant="text"
            color="error"
            prepend-icon="mdi-trash-can-outline"
            @click="form.imageDataUrl = ''"
          >
            Retirer
          </v-btn>
        </div>
        <input ref="picker" type="file" accept="image/*" class="hidden-input" @change="onPickImage" />
        <v-alert v-if="imageError" type="error" variant="tonal" density="comfortable" class="mt-3">
          {{ imageError }}
        </v-alert>
      </v-col>

      <v-col cols="12" md="6">
        <p class="field-label mb-2">Aperçu</p>
        <div class="preview">
          <img v-if="form.imageDataUrl" :src="form.imageDataUrl" alt="" class="preview-img" />
          <v-icon v-else icon="mdi-image-off-outline" size="28" color="secondary" />
          <span class="preview-name">{{ form.title || 'Titre du quizz' }}</span>
        </div>
      </v-col>
    </v-row>

    <v-alert v-if="formError" type="error" variant="tonal" density="comfortable" class="mt-3">
      {{ formError }}
    </v-alert>

    <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" class="mt-4" @click="addBanner">
      Ajouter à la liste
    </v-btn>

    <v-divider class="my-6" />

    <!-- Liste des bannières -->
    <p class="field-label mb-3">Bannières enregistrées</p>

    <v-alert v-if="quizBanners.banners.length === 0" type="info" variant="tonal" density="comfortable">
      Aucune bannière enregistrée pour le moment.
    </v-alert>

    <v-list v-else lines="two">
      <v-list-item
        v-for="banner in quizBanners.banners"
        :key="banner.id"
        class="banner-item mb-2"
        :class="{ 'banner-item--active': banner.id === quizBanners.activeId }"
        rounded="lg"
        border
      >
        <template #prepend>
          <img v-if="banner.imageDataUrl" :src="banner.imageDataUrl" alt="" class="banner-thumb" />
          <v-icon v-else icon="mdi-image-outline" color="primary" />
        </template>

        <v-list-item-title class="banner-title">{{ banner.title || 'Sans titre' }}</v-list-item-title>

        <template #append>
          <v-chip v-if="banner.id === quizBanners.activeId" color="success" size="small" variant="flat" class="mr-2">
            Actif
          </v-chip>
          <v-btn
            v-else
            size="small"
            variant="tonal"
            color="primary"
            class="mr-2"
            @click="quizBanners.setActive(banner.id)"
          >
            Activer
          </v-btn>
          <v-btn size="small" variant="text" color="error" icon="mdi-trash-can-outline" @click="confirmDelete(banner)" />
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="dialog-title">Supprimer cette bannière ?</v-card-title>
        <v-card-text>« {{ toDelete?.title || 'Sans titre' }} » sera définitivement retirée.</v-card-text>
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
import { reactive, ref } from 'vue'
import { useQuizBannersStore } from '@/stores/quizBanners'
import { resizeImageFile } from '@/utils/imageResize'
import { getIdbLastErrorMessage } from '@/utils/idbKeyval'

const quizBanners = useQuizBannersStore()

const form = reactive({ title: '', imageDataUrl: '' })
const picker = ref(null)
const imageError = ref('')
const formError = ref('')
const deleteDialog = ref(false)
const toDelete = ref(null)

function onPickImage(e) {
  imageError.value = ''
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    imageError.value = 'Merci de sélectionner un fichier image.'
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    imageError.value = 'Image trop lourde (8 Mo maximum).'
    return
  }

  resizeImageFile(file)
    .then((dataUrl) => {
      form.imageDataUrl = dataUrl
    })
    .catch((err) => {
      console.error(err)
      imageError.value = "Impossible de traiter cette image."
    })
}

async function addBanner() {
  formError.value = ''
  if (!form.title.trim() && !form.imageDataUrl) {
    formError.value = 'Merci de renseigner un titre et/ou une image.'
    return
  }
  const created = await quizBanners.addBanner({ ...form })
  if (!created) {
    const detail = getIdbLastErrorMessage()
    formError.value =
      "Échec de l'enregistrement : stockage indisponible ou saturé. Essayez avec une image plus légère ou supprimez une bannière existante." +
      (detail ? ` Détail technique : ${detail}` : '')
    return
  }
  form.title = ''
  form.imageDataUrl = ''
}

function confirmDelete(banner) {
  toDelete.value = banner
  deleteDialog.value = true
}

function doDelete() {
  if (toDelete.value) quizBanners.removeBanner(toDelete.value.id)
  deleteDialog.value = false
  toDelete.value = null
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

.hidden-input {
  display: none;
}

.preview {
  border: 1.5px dashed rgba(34, 49, 79, 0.25);
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 72px;
  background-color: rgba(34, 49, 79, 0.02);
}

.preview-img {
  height: 40px;
  width: 40px;
  object-fit: cover;
  border-radius: 8px;
}

.preview-name {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.banner-item {
  border-color: rgba(34, 49, 79, 0.14) !important;
}

.banner-item--active {
  border-color: rgba(62, 122, 92, 0.4) !important;
  background-color: rgba(62, 122, 92, 0.05);
}

.banner-title {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.banner-thumb {
  height: 32px;
  width: 32px;
  object-fit: cover;
  border-radius: 6px;
  margin-right: 4px;
}

.dialog-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
}
</style>
