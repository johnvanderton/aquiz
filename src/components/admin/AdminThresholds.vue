<template>
  <v-card class="pa-6" elevation="0" rounded="lg" border>
    <p class="section-title">Niveaux d'appréciation du score</p>
    <p class="section-sub mt-1">
      Définissez les paliers (en % de bonnes réponses) séparant les niveaux
      <strong>Faible</strong>, <strong>Moyen</strong>, <strong>Élevé</strong> et
      <strong>Parfait</strong>. Le niveau « Parfait » correspond toujours à 100%.
    </p>

    <div class="levels-preview mt-5">
      <div class="level-segment level-faible" :style="{ flexGrow: local.moyen }">
        <span>Faible</span><small>0–{{ local.moyen - 1 }}%</small>
      </div>
      <div class="level-segment level-moyen" :style="{ flexGrow: local.eleve - local.moyen }">
        <span>Moyen</span><small>{{ local.moyen }}–{{ local.eleve - 1 }}%</small>
      </div>
      <div class="level-segment level-eleve" :style="{ flexGrow: 100 - local.eleve }">
        <span>Élevé</span><small>{{ local.eleve }}–99%</small>
      </div>
      <div class="level-segment level-parfait" style="flex-grow: 8">
        <span>Parfait</span><small>100%</small>
      </div>
    </div>

    <v-row class="mt-6">
      <v-col cols="12" sm="6">
        <v-text-field
          v-model.number="local.moyen"
          type="number"
          min="1"
          :max="local.eleve - 1"
          label="Seuil « Moyen » (%)"
          variant="outlined"
          density="comfortable"
          hint="À partir de ce %, la question passe de Faible à Moyen"
          persistent-hint
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model.number="local.eleve"
          type="number"
          :min="local.moyen + 1"
          max="99"
          label="Seuil « Élevé » (%)"
          variant="outlined"
          density="comfortable"
          hint="À partir de ce %, le score passe de Moyen à Élevé"
          persistent-hint
        />
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" density="comfortable" class="mb-4">
      {{ error }}
    </v-alert>

    <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save-outline" @click="save">
      Enregistrer les seuils
    </v-btn>
    <v-scale-transition>
      <v-chip v-if="saved" color="success" variant="tonal" class="ml-3">Enregistré</v-chip>
    </v-scale-transition>
  </v-card>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'

const library = useLibraryStore()
const local = reactive({ ...library.thresholds })
const saved = ref(false)
const error = ref('')

watch(
  () => library.thresholds,
  (val) => Object.assign(local, val)
)

function save() {
  error.value = ''
  const moyen = Number(local.moyen)
  const eleve = Number(local.eleve)

  if (!Number.isFinite(moyen) || !Number.isFinite(eleve)) {
    error.value = 'Merci de saisir des nombres valides.'
    return
  }
  if (moyen < 1 || moyen > 98) {
    error.value = 'Le seuil « Moyen » doit être compris entre 1 et 98.'
    return
  }
  if (eleve <= moyen || eleve > 99) {
    error.value = 'Le seuil « Élevé » doit être supérieur au seuil « Moyen » et inférieur à 100.'
    return
  }

  library.setThresholds({ moyen, eleve })
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
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

.levels-preview {
  display: flex;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  gap: 2px;
}

.level-segment {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.72rem;
  font-weight: 700;
  min-width: 46px;
}

.level-segment small {
  font-weight: 500;
  font-size: 0.65rem;
  opacity: 0.9;
}

.level-faible { background-color: rgb(var(--v-theme-error)); }
.level-moyen { background-color: rgb(var(--v-theme-warning)); }
.level-eleve { background-color: rgb(var(--v-theme-info)); }
.level-parfait { background-color: rgb(var(--v-theme-success)); }
</style>
