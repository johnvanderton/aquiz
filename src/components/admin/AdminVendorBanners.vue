<template>
  <v-card class="pa-6" elevation="0" rounded="lg" border>
    <p class="section-title">Bannières vendeurs</p>
    <p class="section-sub mt-1">
      Créez une bannière par vendeur/courtier (nom, logo, email de contact).
      Une seule est active à la fois : elle est utilisée sur le formulaire
      de contact, le bouton « Plus d'informations » et l'en-tête du PDF de
      résultat.
    </p>

    <!-- Formulaire d'ajout -->
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="form.name"
          label="Nom du vendeur"
          placeholder="Ex : Cabinet Dupont Assurances"
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          v-model="form.contactEmail"
          label="Email de contact"
          placeholder="ex: contact@moncabinet.fr"
          type="email"
          variant="outlined"
          density="comfortable"
          class="mt-2"
        />
        <div class="d-flex align-center ga-3 mt-2">
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-image-outline" @click="picker?.click()">
            {{ form.imageDataUrl ? 'Changer le logo' : 'Ajouter un logo' }}
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
          <span class="preview-name">{{ form.name || 'Nom du vendeur' }}</span>
        </div>
      </v-col>
    </v-row>

    <v-alert v-if="formError" type="error" variant="tonal" density="comfortable" class="mt-3">
      {{ formError }}
    </v-alert>

    <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" class="mt-4" @click="addVendor">
      Ajouter à la liste
    </v-btn>

    <v-divider class="my-6" />

    <!-- Liste des bannières vendeurs -->
    <p class="field-label mb-3">Vendeurs enregistrés</p>

    <v-alert v-if="vendors.vendors.length === 0" type="info" variant="tonal" density="comfortable">
      Aucun vendeur enregistré pour le moment.
    </v-alert>

    <v-list v-else lines="two">
      <v-list-item
        v-for="vendor in vendors.vendors"
        :key="vendor.id"
        class="vendor-item mb-2"
        :class="{ 'vendor-item--active': vendor.id === vendors.activeId }"
        rounded="lg"
        border
      >
        <template #prepend>
          <img v-if="vendor.imageDataUrl" :src="vendor.imageDataUrl" alt="" class="vendor-thumb" />
          <v-icon v-else icon="mdi-domain" color="primary" />
        </template>

        <v-list-item-title class="vendor-name">{{ vendor.name || 'Sans nom' }}</v-list-item-title>
        <v-list-item-subtitle>{{ vendor.contactEmail || 'Pas d’email renseigné' }}</v-list-item-subtitle>

        <template #append>
          <v-chip v-if="vendor.id === vendors.activeId" color="success" size="small" variant="flat" class="mr-2">
            Actif
          </v-chip>
          <v-btn v-else size="small" variant="tonal" color="primary" class="mr-2" @click="vendors.setActive(vendor.id)">
            Activer
          </v-btn>
          <v-btn size="small" variant="text" color="error" icon="mdi-trash-can-outline" @click="confirmDelete(vendor)" />
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="dialog-title">Supprimer ce vendeur ?</v-card-title>
        <v-card-text>« {{ toDelete?.name }} » sera définitivement retiré de la liste.</v-card-text>
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
import { useVendorsStore } from '@/stores/vendors'
import { resizeImageFile } from '@/utils/imageResize'
import { getIdbLastErrorMessage } from '@/utils/idbKeyval'

const vendors = useVendorsStore()

const form = reactive({ name: '', contactEmail: '', imageDataUrl: '' })
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

async function addVendor() {
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = 'Merci de renseigner un nom de vendeur.'
    return
  }
  const created = await vendors.addVendor({ ...form })
  if (!created) {
    const detail = getIdbLastErrorMessage()
    formError.value =
      "Échec de l'enregistrement : stockage indisponible ou saturé. Essayez avec une image plus légère ou supprimez un vendeur existant." +
      (detail ? ` Détail technique : ${detail}` : '')
    return
  }
  form.name = ''
  form.contactEmail = ''
  form.imageDataUrl = ''
}

function confirmDelete(vendor) {
  toDelete.value = vendor
  deleteDialog.value = true
}

function doDelete() {
  if (toDelete.value) vendors.removeVendor(toDelete.value.id)
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

.vendor-item {
  border-color: rgba(34, 49, 79, 0.14) !important;
}

.vendor-item--active {
  border-color: rgba(62, 122, 92, 0.4) !important;
  background-color: rgba(62, 122, 92, 0.05);
}

.vendor-name {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.vendor-thumb {
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
