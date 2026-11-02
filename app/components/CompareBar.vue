<script setup lang="ts">
import type { OfferRow } from '#shared/prices'
import { comparePath } from '#shared/routes'
import { euro, size } from '#shared/format'
import { shopName } from '#shared/shops'

const props = defineProps<{ picks: OfferRow[] }>()
defineEmits<{ remove: [id: string]; clear: [] }>()

const LETTERS = ['A', 'B'] as const
const slots = computed(() => LETTERS.map((letter, i) => ({ letter, row: props.picks[i] ?? null })))
const target = computed(() => {
  const [a, b] = props.picks
  return a && b ? comparePath(a.id, b.id) : undefined
})
</script>

<template>
  <aside
    class="fixed inset-x-0 bottom-0 z-50 animate-slide-up px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    aria-label="Auswahl zum Vergleichen"
  >
    <div
      class="mx-auto flex max-w-(--ui-container) flex-col gap-3 rounded-xl bg-surface p-3 shadow-float ring ring-accented sm:flex-row sm:items-center"
    >
      <ol class="grid min-w-0 flex-1 grid-cols-2 gap-2">
        <li
          v-for="s in slots"
          :key="s.letter"
          class="flex min-h-12 min-w-0 items-center gap-2.5 rounded-lg border-l-4 bg-elevated/60 px-2.5 py-1.5"
          :class="[s.letter === 'A' ? 'border-series-a' : 'border-series-b', !s.row && 'border-dashed bg-transparent']"
        >
          <span
            class="display text-xl leading-none"
            :class="s.letter === 'A' ? 'text-series-a' : 'text-series-b'"
            aria-hidden="true"
          >{{ s.letter }}</span>
          <template v-if="s.row">
            <ProductImage :src="s.row.image" :alt="s.row.product" :width="36" class="hidden size-9 sm:grid" />
            <span class="grid min-w-0">
              <span class="truncate text-sm font-semibold text-highlighted">{{ s.row.product }}</span>
              <span class="num truncate text-xs text-muted">
                {{ shopName(s.row.shopId) }} · {{ size(s.row.sizeG) }} · {{ euro(s.row.perKgCents) }}/kg
              </span>
            </span>
            <UButton
              class="ml-auto shrink-0"
              icon="i-lucide-x"
              size="xs"
              color="neutral"
              variant="ghost"
              :aria-label="`${s.row.product} entfernen`"
              @click="$emit('remove', s.row.id)"
            />
          </template>
          <span v-else class="font-display text-sm text-muted italic">Noch ein Angebot wählen</span>
        </li>
      </ol>
      <div class="flex items-center gap-2">
        <UButton
          :to="target"
          :disabled="!target"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
          class="flex-1 justify-center sm:flex-none"
        >
          Vergleichen
        </UButton>
        <UButton size="lg" color="neutral" variant="ghost" @click="$emit('clear')">Leeren</UButton>
      </div>
    </div>
  </aside>
</template>
