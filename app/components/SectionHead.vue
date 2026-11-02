<script setup lang="ts">
defineProps<{ id: string; title: string }>()
</script>

<template>
  <header class="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-default pb-3">
    <h2 :id="id" class="display text-headline text-highlighted">{{ title }}</h2>
    <div v-if="$slots.default || $slots.aside" class="flex items-center gap-3">
      <p v-if="$slots.default" class="eyebrow">
        <slot />
      </p>
      <slot name="aside" />
    </div>
  </header>
</template>
