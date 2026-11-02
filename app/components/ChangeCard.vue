<script setup lang="ts">
import type { ChangedRow } from '#shared/prices'
import { offerPath } from '#shared/routes'
import { euro, size } from '#shared/format'
import { shopName } from '#shared/shops'

const props = defineProps<{ row: ChangedRow }>()
const dir = computed(() => props.row.change.direction)
</script>

<template>
  <NuxtLink
    :to="offerPath(row.id)"
    class="group relative flex flex-col gap-3 overflow-hidden rounded-lg bg-surface p-4 shadow-card ring ring-default transition hover:-translate-y-0.5 hover:ring-accented focus-visible:outline-2 focus-visible:outline-primary"
  >
    <span class="absolute inset-y-0 left-0 w-1" :class="dir === 'down' ? 'bg-down' : 'bg-up'" aria-hidden="true" />
    <div class="flex items-start justify-between gap-2">
      <span class="eyebrow">{{ shopName(row.shopId) }} · {{ size(row.sizeG) }}</span>
      <PriceDelta :pct="row.change.pct" :direction="dir" size="xs" />
    </div>
    <div class="flex items-center gap-3">
      <ProductImage :src="row.image" :alt="row.product" :width="56" class="size-14" />
      <h3 class="font-display text-lg leading-tight font-semibold text-highlighted group-hover:text-primary">
        {{ row.product }}
      </h3>
    </div>
    <div class="flex flex-wrap items-baseline gap-2">
      <s class="num text-sm text-dimmed">{{ euro(row.change.fromCents) }}</s>
      <UIcon name="i-lucide-arrow-right" class="size-3.5 self-center text-dimmed" />
      <span class="num text-2xl font-semibold text-highlighted">{{ euro(row.change.toCents) }}</span>
    </div>
    <div class="mt-auto flex items-end justify-between border-t border-default pt-3 text-xs text-muted">
      <span class="num">{{ euro(row.perKgCents) }}/kg</span>
      <Sparkline :points="row.history" :direction="dir" :width="80" :height="22" />
    </div>
  </NuxtLink>
</template>
