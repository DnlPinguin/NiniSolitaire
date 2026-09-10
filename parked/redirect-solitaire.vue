<script setup lang="ts">
/**
 * Das Spiel liegt jetzt auf "/". Diese Route bleibt nur bestehen, damit
 * bereits verschickte Teilen-Links (/games/solitaire?g=…) weiter funktionieren.
 */
const route = useRoute()
await navigateTo({ path: '/', query: route.query }, { replace: true })
</script>

<template>
  <div />
</template>
