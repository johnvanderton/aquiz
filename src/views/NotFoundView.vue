<template>
  <v-container class="fill-height" max-width="560">
    <v-responsive class="mx-auto text-center">
      <v-icon icon="mdi-compass-off-outline" size="64" color="secondary" class="mb-4" />
      <h1 class="not-found-title">404</h1>
      <p class="not-found-message mt-3">
        You have reached the edge of the internet.<br />
        Turn back before things get weird.
      </p>
      <v-btn color="primary" variant="flat" class="mt-8" to="/">
        Retour à l'accueil
      </v-btn>
    </v-responsive>
  </v-container>
</template>

<style scoped>
.not-found-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 3.2rem;
  color: rgb(var(--v-theme-primary));
}

.not-found-message {
  color: #5b5f6b;
  font-size: 1.05rem;
  line-height: 1.6;
}
</style>
