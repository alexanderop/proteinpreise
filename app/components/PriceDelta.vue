<script setup lang="ts">
import { percent } from '#shared/format'

withDefaults(defineProps<{ pct: number; direction: 'up' | 'down'; size?: 'xs' | 'sm' | 'md' }>(), { size: 'sm' })
</script>

<template>
  <span
    class="num inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap"
    :class="[
      direction === 'down' ? 'bg-down-soft text-down' : 'bg-up-soft text-up',
      { xs: 'px-1.5 py-px text-[0.6875rem]', sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' }[size],
    ]"
  >
    <UIcon :name="direction === 'down' ? 'i-lucide-trending-down' : 'i-lucide-trending-up'" class="size-[1.1em]" />
    {{ percent(pct) }}
    <slot />
  </span>
</template>
