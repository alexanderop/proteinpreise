<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import type { CatalogEntry } from '#shared/prices'
import type { Side } from '#shared/compare'
import { CATEGORIES, CATEGORY_LABEL, type Category } from '#shared/types'
import { euro, size } from '#shared/format'
import { shopName } from '#shared/shops'
import { shopBrand } from '#shared/brands'

const props = defineProps<{ entries: CatalogEntry[]; side: Side | null; exclude: string | null }>()
const emit = defineEmits<{ select: [id: string]; close: [] }>()

const open = computed({
  get: () => props.side !== null,
  set: (value) => {
    if (!value) emit('close')
  },
})

const category = ref<Category | 'all'>('all')
const brand = ref<string>(ALL_BRANDS)
const searchTerm = ref('')
watch(
  () => props.side,
  (side) => {
    if (side) searchTerm.value = ''
  },
)

const options = computed(() =>
  props.entries
    .filter((e) => e.listed && e.offer.id !== props.exclude)
    .map((e) => ({ ...e.offer, shop: shopName(e.offer.shopId), perKgCents: e.series.at(-1)!.perKgCents }))
    .toSorted((a, b) => a.perKgCents - b.perKgCents),
)

const brands = computed(() => brandItems(options.value))

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() =>
  CATEGORIES.filter((c) => category.value === 'all' || c === category.value)
    .map((c) => ({
      id: c,
      label: CATEGORY_LABEL[c],
      items: options.value
        .filter((o) => o.category === c && (brand.value === ALL_BRANDS || o.brand === brand.value))
        .map((o) => ({
          id: o.id,
          label: o.product,
          description: `${o.brand === shopBrand(o.shopId) ? o.shop : `${o.brand} bei ${o.shop}`} · ${size(o.sizeG)} · ${euro(o.priceCents)}`,
          suffix: `${euro(o.perKgCents)}/kg`,
          avatar: o.image
            ? { src: o.image, alt: '', loading: 'lazy' as const, size: 'xl' as const, class: 'rounded-md bg-photo ring ring-default' }
            : { icon: 'i-lucide-package', size: 'xl' as const },
          onSelect: () => emit('select', o.id),
        })),
    }))
    .filter((g) => g.items.length),
)

const chips = [{ value: 'all' as const, label: 'Alle' }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Angebot ${side?.toUpperCase() ?? ''} wählen`"
    description="Alle aktuellen Angebote, pro Kilo aufsteigend"
    :ui="{ content: 'max-w-2xl', body: 'p-0 sm:p-0', header: side === 'b' ? 'border-t-4 border-series-b' : 'border-t-4 border-series-a' }"
  >
    <template #body>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-default px-4 py-3">
        <div class="flex flex-1 flex-wrap gap-1.5" role="group" aria-label="Kategorie">
        <UButton
          v-for="c in chips"
          :key="c.value"
          size="xs"
          color="neutral"
          class="rounded-full"
          :variant="category === c.value ? 'solid' : 'outline'"
          :aria-pressed="category === c.value"
          @click="category = c.value"
        >
          {{ c.label }}
        </UButton>
        </div>
        <USelectMenu
          v-model="brand"
          :items="brands"
          value-key="value"
          size="sm"
          icon="i-lucide-tag"
          aria-label="Marke"
          :search-input="{ placeholder: 'Marke suchen' }"
          class="w-full sm:w-52"
          :ui="{ content: 'min-w-56' }"
        >
          <template #item-trailing="{ item }">
            <span class="num text-xs text-dimmed">{{ item.count }}</span>
          </template>
        </USelectMenu>
      </div>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="groups"
        :fuse="{ resultLimit: 500, fuseOptions: { keys: ['label', 'description'], threshold: 0.3, ignoreLocation: true } }"
        placeholder="Produkt, Marke oder Shop, z. B. Clear Whey, Bodylab"
        class="h-[min(60dvh,32rem)]"
        :ui="{ itemLabelSuffix: 'num ml-auto pl-3 font-semibold text-highlighted', itemLabel: 'flex w-full' }"
      />
    </template>
  </UModal>
</template>
