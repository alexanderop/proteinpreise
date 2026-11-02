<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OfferRow } from '#shared/prices'
import { offerPath } from '#shared/routes'
import { CATEGORIES, CATEGORY_LABEL, type Category } from '#shared/types'
import { euro, size } from '#shared/format'
import { SHOPS, shopName } from '#shared/shops'

const props = defineProps<{ rows: OfferRow[]; selected: readonly string[] }>()
defineEmits<{ toggle: [id: string] }>()

const pickLetter = (id: string) => (['A', 'B'] as const)[props.selected.indexOf(id)] ?? null

type SortKey = 'product' | 'shop' | 'size' | 'price' | 'perKg'

const SORTS: Record<SortKey, { label: string; value: (r: OfferRow) => number | string; numeric: boolean }> = {
  product: { label: 'Produkt', value: (r) => r.product.toLowerCase(), numeric: false },
  shop: { label: 'Shop', value: (r) => shopName(r.shopId).toLowerCase(), numeric: false },
  size: { label: 'Größe', value: (r) => r.sizeG, numeric: true },
  price: { label: 'Preis', value: (r) => r.priceCents, numeric: true },
  perKg: { label: '€/kg', value: (r) => r.perKgCents, numeric: true },
}

const SORT_OPTIONS = [
  { label: '€/kg aufsteigend', value: 'perKg:1' },
  { label: 'Preis aufsteigend', value: 'price:1' },
  { label: 'Preis absteigend', value: 'price:-1' },
  { label: 'Größte Packung', value: 'size:-1' },
  { label: 'Produkt A–Z', value: 'product:1' },
]

const category = ref<Category | 'all'>('all')
const shop = ref<string>('all')
const brand = ref<string>(ALL_BRANDS)
const brands = computed(() => brandItems(props.rows))
const query = ref('')
const onlyReduced = ref(false)
const sort = ref<{ key: SortKey; dir: 1 | -1 }>({ key: 'perKg', dir: 1 })

const sortValue = computed({
  get: () => `${sort.value.key}:${sort.value.dir}`,
  set: (v: string) => {
    const [key, dir] = v.split(':')
    if (key && key in SORTS) sort.value = { key: key as SortKey, dir: dir === '-1' ? -1 : 1 }
  },
})

const counts = computed(() => {
  const byCategory = new Map<Category, number>()
  for (const r of props.rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1)
  return byCategory
})

const reducedCount = computed(() => props.rows.filter((r) => r.reduced).length)

const shopItems = computed(() => [
  { label: 'Alle Shops', value: 'all' },
  ...SHOPS.filter((s) => props.rows.some((r) => r.shopId === s.id)).map((s) => ({ label: s.name, value: s.id })),
])

const categoryChips = computed(() => [
  { value: 'all' as const, label: 'Alle', count: props.rows.length },
  ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c], count: counts.value.get(c) ?? 0 })),
])

const visible = computed(() => {
  const terms = query.value.toLowerCase().split(/\s+/).filter(Boolean)
  const { key, dir } = sort.value
  const value = SORTS[key].value
  return props.rows
    .filter((r) => category.value === 'all' || r.category === category.value)
    .filter((r) => shop.value === 'all' || r.shopId === shop.value)
    .filter((r) => brand.value === ALL_BRANDS || r.brand === brand.value)
    .filter((r) => !onlyReduced.value || r.reduced)
    .filter((r) => {
      const haystack = `${r.product} ${r.brand} ${shopName(r.shopId)} ${CATEGORY_LABEL[r.category]}`.toLowerCase()
      return terms.every((t) => haystack.includes(t))
    })
    .toSorted((a, b) => {
      const va = value(a)
      const vb = value(b)
      const primary = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'de')
      return primary * dir || a.perKgCents - b.perKgCents
    })
})

function sortBy(key: SortKey) {
  sort.value = sort.value.key === key ? { key, dir: sort.value.dir === 1 ? -1 : 1 } : { key, dir: 1 }
}

function sortIcon(key: SortKey) {
  if (sort.value.key !== key) return 'i-lucide-arrow-up-down'
  return sort.value.dir === 1 ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

function ariaSort(key: SortKey) {
  if (sort.value.key !== key) return 'unsortiert'
  return sort.value.dir === 1 ? 'aufsteigend' : 'absteigend'
}

function reset() {
  category.value = 'all'
  shop.value = 'all'
  brand.value = ALL_BRANDS
  query.value = ''
  onlyReduced.value = false
}

const numericCell = 'text-right whitespace-nowrap'
const columns: TableColumn<OfferRow>[] = [
  { id: 'product', meta: { class: { td: 'w-[40%] whitespace-normal' } } },
  { id: 'shop', meta: { class: { td: 'whitespace-nowrap text-muted' } } },
  { id: 'size', meta: { class: { th: 'text-right', td: numericCell } } },
  { id: 'price', meta: { class: { th: 'text-right', td: numericCell } } },
  { id: 'perKg', meta: { class: { th: 'text-right', td: numericCell } } },
  { id: 'trend' },
  { id: 'cmp', meta: { class: { td: 'w-px text-right' } } },
]
const SORTABLE = Object.keys(SORTS) as SortKey[]
</script>

<template>
  <section>
    <div class="mb-4 grid gap-4">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Kategorie">
        <UButton
          v-for="c in categoryChips"
          :key="c.value"
          size="sm"
          color="neutral"
          :variant="category === c.value ? 'solid' : 'outline'"
          class="rounded-full"
          :aria-pressed="category === c.value"
          :disabled="c.count === 0"
          @click="category = c.value"
        >
          {{ c.label }}
          <span class="num text-xs opacity-60">{{ c.count }}</span>
        </UButton>
        <UButton
          size="sm"
          color="warning"
          :variant="onlyReduced ? 'solid' : 'outline'"
          class="rounded-full"
          :aria-pressed="onlyReduced"
          @click="onlyReduced = !onlyReduced"
        >
          Reduziert
          <span class="num text-xs opacity-70">{{ reducedCount }}</span>
        </UButton>
      </div>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <UInput
          v-model="query"
          type="search"
          icon="i-lucide-search"
          size="lg"
          placeholder="Suche, z. B. Isolat Vanille, Bodylab"
          autocomplete="off"
          aria-label="Suche"
          class="col-span-2 md:col-span-1"
        />
        <USelectMenu
          v-model="brand"
          :items="brands"
          value-key="value"
          size="lg"
          icon="i-lucide-tag"
          aria-label="Marke"
          :search-input="{ placeholder: 'Marke suchen' }"
          class="w-full"
        >
          <template #item-trailing="{ item }">
            <span class="num text-xs text-dimmed">{{ item.count }}</span>
          </template>
        </USelectMenu>
        <USelect v-model="shop" :items="shopItems" size="lg" aria-label="Shop" class="w-full" />
        <USelect v-model="sortValue" :items="SORT_OPTIONS" size="lg" aria-label="Sortierung" class="col-span-2 w-full md:hidden" />
      </div>

      <p class="text-sm text-muted" aria-live="polite">
        <span class="num font-medium text-highlighted">{{ visible.length }}</span> von
        <span class="num">{{ rows.length }}</span> Angeboten
      </p>
    </div>

    <UCard variant="outline" class="hidden md:block" :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="visible" :columns="columns" :get-row-id="(r: OfferRow) => r.id" empty="Nichts gefunden.">
        <template v-for="key in SORTABLE" :key="key" #[`${key}-header`]>
          <UButton
            variant="link"
            color="neutral"
            size="xs"
            class="eyebrow -mx-2 px-2"
            :class="[SORTS[key].numeric && 'ml-auto flex', sort.key === key && 'text-highlighted']"
            :trailing-icon="sortIcon(key)"
            :aria-label="`Nach ${SORTS[key].label} sortieren, ${ariaSort(key)}`"
            @click="sortBy(key)"
          >
            {{ SORTS[key].label }}
          </UButton>
        </template>
        <template #trend-header><span class="eyebrow">Verlauf</span></template>
        <template #cmp-header><span class="sr-only">Vergleich</span></template>

        <template #product-cell="{ row: { original: r } }">
          <div class="flex items-center gap-3">
            <ProductImage :src="r.image" :alt="r.product" :width="48" class="size-12" />
            <div class="min-w-0">
              <NuxtLink :to="offerPath(r.id)" class="font-semibold text-highlighted hover:text-primary">
                {{ r.product }}
              </NuxtLink>
              <OfferMeta :row="r" class="mt-1" />
            </div>
          </div>
        </template>
        <template #shop-cell="{ row: { original: r } }">{{ shopName(r.shopId) }}</template>
        <template #size-cell="{ row: { original: r } }"><span class="num">{{ size(r.sizeG) }}</span></template>
        <template #price-cell="{ row: { original: r } }">
          <span class="num">{{ euro(r.priceCents) }}</span>
          <s v-if="r.reduced && r.compareAtCents" class="num block text-xs text-dimmed">{{ euro(r.compareAtCents) }}</s>
        </template>
        <template #perKg-cell="{ row: { original: r } }">
          <span class="num font-semibold text-highlighted">{{ euro(r.perKgCents) }}</span>
        </template>
        <template #trend-cell="{ row: { original: r } }">
          <div class="flex items-center gap-2">
            <Sparkline :points="r.history" :direction="r.change?.direction ?? null" />
            <PriceDelta v-if="r.change" :pct="r.change.pct" :direction="r.change.direction" size="xs" />
          </div>
        </template>
        <template #cmp-cell="{ row: { original: r } }">
          <CompareToggle :letter="pickLetter(r.id)" :label="`${r.product}, ${shopName(r.shopId)}, ${size(r.sizeG)}`" @toggle="$emit('toggle', r.id)" />
        </template>
      </UTable>
    </UCard>

    <ul class="grid gap-3 md:hidden">
      <li v-for="r in visible" :key="r.id" class="rounded-lg bg-surface p-4 shadow-card ring ring-default">
        <div class="flex items-start gap-3">
          <ProductImage :src="r.image" :alt="r.product" :width="56" class="size-14" />
          <div class="min-w-0 flex-1">
            <NuxtLink :to="offerPath(r.id)" class="font-semibold text-highlighted">{{ r.product }}</NuxtLink>
            <p class="mt-0.5 text-sm text-muted">{{ shopName(r.shopId) }} · {{ size(r.sizeG) }}</p>
          </div>
          <CompareToggle :letter="pickLetter(r.id)" :label="`${r.product}, ${shopName(r.shopId)}, ${size(r.sizeG)}`" @toggle="$emit('toggle', r.id)" />
        </div>
        <OfferMeta :row="r" class="mt-2" />
        <div class="mt-3 flex items-end justify-between gap-3 border-t border-default pt-3">
          <div>
            <span class="num text-lg font-semibold text-highlighted">{{ euro(r.priceCents) }}</span>
            <s v-if="r.reduced && r.compareAtCents" class="num ml-2 text-xs text-dimmed">{{ euro(r.compareAtCents) }}</s>
            <p class="num text-sm text-toned">{{ euro(r.perKgCents) }}<span class="text-dimmed">/kg</span></p>
          </div>
          <div class="flex items-center gap-2">
            <PriceDelta v-if="r.change" :pct="r.change.pct" :direction="r.change.direction" size="xs" />
            <Sparkline :points="r.history" :direction="r.change?.direction ?? null" />
          </div>
        </div>
      </li>
    </ul>

    <div v-if="visible.length === 0" class="grid justify-items-center gap-3 py-10 text-muted">
      <p class="md:hidden">Nichts gefunden.</p>
      <UButton color="neutral" variant="outline" icon="i-lucide-x" @click="reset">Filter zurücksetzen</UButton>
    </div>
  </section>
</template>
