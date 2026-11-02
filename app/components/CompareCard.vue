<script setup lang="ts">
import type { Side, Slot, Standing } from '#shared/compare'
import { isReduced } from '#shared/prices'
import { offerPath } from '#shared/routes'
import { CATEGORY_LABEL } from '#shared/types'
import { day, euro, share, size } from '#shared/format'
import { shopName } from '#shared/shops'

const props = defineProps<{ side: Side; state: Slot; standing: Standing | null }>()
defineEmits<{ pick: [] }>()

const current = computed(() => (props.state.kind === 'offer' ? props.state.entry.series.at(-1)! : null))
const tone = computed(() =>
  props.side === 'a'
    ? { text: 'text-series-a', bg: 'bg-series-a', border: 'border-series-a' }
    : { text: 'text-series-b', bg: 'bg-series-b', border: 'border-series-b' },
)
</script>

<template>
  <article
    class="relative flex min-w-0 animate-rise flex-col gap-1.5 overflow-hidden rounded-xl p-6"
    :class="
      state.kind === 'offer'
        ? 'bg-surface shadow-card ring ring-default'
        : 'border-2 border-dashed border-accented bg-transparent'
    "
    :style="{ animationDelay: side === 'b' ? '90ms' : undefined }"
  >
    <span class="absolute inset-x-0 top-0 h-1.5" :class="tone.bg" aria-hidden="true" />
    <span class="display absolute top-4 right-5 text-6xl leading-none opacity-90" :class="tone.text" aria-hidden="true">
      {{ side.toUpperCase() }}
    </span>

    <template v-if="state.kind === 'offer'">
      <ProductImage
        :src="state.entry.image"
        :alt="state.entry.offer.product"
        :width="112"
        eager
        class="mb-3 size-24 sm:size-28"
      />
      <p class="eyebrow pr-12">
        {{ shopName(state.entry.offer.shopId) }} · {{ size(state.entry.offer.sizeG) }} ·
        {{ CATEGORY_LABEL[state.entry.offer.category] }}
      </p>
      <h2 class="display mt-1 pr-10 text-headline break-words text-highlighted">
        <NuxtLink :to="offerPath(state.entry.offer.id)" class="hover:underline hover:decoration-2 hover:underline-offset-4">
          {{ state.entry.offer.product }}
        </NuxtLink>
      </h2>
      <p class="num mt-4 text-5xl leading-none font-semibold text-highlighted">
        {{ euro(current!.perKgCents) }}<span class="text-lg font-medium text-muted">/kg</span>
      </p>
      <p class="num text-sm text-muted">{{ euro(current!.priceCents) }} für {{ size(state.entry.offer.sizeG) }}</p>
      <div class="mt-2 flex min-h-6 flex-wrap items-center gap-2 text-sm">
        <UBadge v-if="standing?.role === 'cheaper'" class="bg-down-soft text-down" icon="i-lucide-trending-down">
          {{ share(standing.pct) }} günstiger pro Kilo
        </UBadge>
        <UBadge v-else-if="standing?.role === 'dearer'" class="bg-up-soft text-up" icon="i-lucide-trending-up">
          {{ euro(standing.diffPerKgCents) }} mehr pro Kilo
        </UBadge>
        <UBadge v-else-if="standing?.role === 'equal'" color="neutral" variant="subtle">gleich teuer pro Kilo</UBadge>
        <UBadge v-if="state.entry.listed && isReduced(state.entry.offer)" class="bg-marker text-marker-text">Reduziert</UBadge>
        <UBadge v-if="!state.entry.listed" color="error" variant="subtle">
          Nicht mehr gelistet, zuletzt {{ day(current!.date) }}
        </UBadge>
      </div>
      <div class="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <UButton color="neutral" variant="outline" icon="i-lucide-arrow-left-right" @click="$emit('pick')">
          Anderes Angebot
        </UButton>
        <UButton
          :to="state.entry.offer.url"
          target="_blank"
          rel="noopener nofollow"
          color="neutral"
          variant="ghost"
          trailing-icon="i-lucide-external-link"
        >
          Zum Shop
        </UButton>
      </div>
    </template>

    <div v-else class="grid justify-items-start gap-2 pr-12">
      <p class="display text-headline text-highlighted">
        {{ state.kind === 'unknown' ? 'Dieses Angebot kennen wir nicht.' : `Angebot ${side.toUpperCase()}` }}
      </p>
      <p class="max-w-[36ch] font-display text-muted italic">
        {{
          state.kind === 'unknown'
            ? 'Der Link zeigt auf ein Angebot, das in keinem Abruf vorkommt. Wähle ein anderes.'
            : 'Noch leer. Wähle ein Proteinpulver aus allen aktuellen Angeboten.'
        }}
      </p>
      <UButton class="mt-2" size="lg" icon="i-lucide-plus" @click="$emit('pick')">Angebot wählen</UButton>
    </div>
  </article>
</template>
