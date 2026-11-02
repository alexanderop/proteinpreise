<script setup lang="ts">
defineProps<{ letter: 'A' | 'B' | null; label: string }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <UButton
    size="xs"
    :variant="letter ? 'solid' : 'outline'"
    color="neutral"
    class="min-w-24 justify-center"
    :class="letter && (letter === 'A' ? 'bg-series-a hover:bg-series-a/90' : 'bg-series-b hover:bg-series-b/90') + ' text-inverted'"
    :icon="letter ? 'i-lucide-check' : 'i-lucide-plus'"
    :aria-pressed="letter !== null"
    :aria-label="`${label} vergleichen`"
    @click="$emit('toggle')"
  >
    {{ letter ?? 'Vergleich' }}
  </UButton>
</template>
