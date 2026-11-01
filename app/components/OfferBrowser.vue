<script setup lang="ts">
import type { OfferRow } from '#shared/prices'
import { toRouteId } from '#shared/prices'
import { CATEGORIES, CATEGORY_LABEL, type Category } from '#shared/types'
import { euro, percent, size } from '#shared/format'
import { SHOPS, shopName } from '#shared/shops'

const props = defineProps<{ rows: OfferRow[]; selected: readonly string[] }>()
defineEmits<{ toggle: [id: string] }>()

const pickLetter = (id: string) => ['A', 'B'][props.selected.indexOf(id)] ?? null

type SortKey = 'product' | 'shop' | 'size' | 'price' | 'perKg'

const SORTS: Record<SortKey, { label: string; value: (r: OfferRow) => number | string; numeric: boolean }> = {
  product: { label: 'Produkt', value: (r) => r.product.toLowerCase(), numeric: false },
  shop: { label: 'Shop', value: (r) => shopName(r.shopId).toLowerCase(), numeric: false },
  size: { label: 'Größe', value: (r) => r.sizeG, numeric: true },
  price: { label: 'Preis', value: (r) => r.priceCents, numeric: true },
  perKg: { label: '€/kg', value: (r) => r.perKgCents, numeric: true },
}
const COLUMNS = Object.keys(SORTS) as SortKey[]

const category = ref<Category | 'all'>('all')
const shop = ref<string>('all')
const query = ref('')
const onlyReduced = ref(false)
const sort = ref<{ key: SortKey; dir: 1 | -1 }>({ key: 'perKg', dir: 1 })

const counts = computed(() => {
  const byCategory = new Map<Category, number>()
  for (const r of props.rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1)
  return byCategory
})

const reducedCount = computed(() => props.rows.filter((r) => r.reduced).length)

const shopsWithOffers = computed(() => SHOPS.filter((s) => props.rows.some((r) => r.shopId === s.id)))

const visible = computed(() => {
  const terms = query.value.toLowerCase().split(/\s+/).filter(Boolean)
  const { key, dir } = sort.value
  const value = SORTS[key].value
  return props.rows
    .filter((r) => category.value === 'all' || r.category === category.value)
    .filter((r) => shop.value === 'all' || r.shopId === shop.value)
    .filter((r) => !onlyReduced.value || r.reduced)
    .filter((r) => {
      const haystack = `${r.product} ${shopName(r.shopId)} ${CATEGORY_LABEL[r.category]}`.toLowerCase()
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

function onSortSelect(event: Event) {
  const [key, dir] = (event.target as HTMLSelectElement).value.split(':')
  if (key && key in SORTS) sort.value = { key: key as SortKey, dir: dir === '-1' ? -1 : 1 }
}

function ariaSort(key: SortKey) {
  if (sort.value.key !== key) return 'none'
  return sort.value.dir === 1 ? 'ascending' : 'descending'
}

function reset() {
  category.value = 'all'
  shop.value = 'all'
  query.value = ''
  onlyReduced.value = false
}
</script>

<template>
  <section class="browser">
    <div class="filters">
      <div class="chips" role="group" aria-label="Kategorie">
        <button type="button" class="chip" :aria-pressed="category === 'all'" @click="category = 'all'">
          Alle <span class="num">{{ rows.length }}</span>
        </button>
        <button
          v-for="c in CATEGORIES"
          :key="c"
          type="button"
          class="chip"
          :aria-pressed="category === c"
          :disabled="!counts.get(c)"
          @click="category = c"
        >
          {{ CATEGORY_LABEL[c] }} <span class="num">{{ counts.get(c) ?? 0 }}</span>
        </button>
        <button type="button" class="chip chip-reduced" :aria-pressed="onlyReduced" @click="onlyReduced = !onlyReduced">
          Reduziert <span class="num">{{ reducedCount }}</span>
        </button>
      </div>
      <div class="controls">
        <label class="field search">
          <span class="kicker">Suche</span>
          <input v-model="query" type="search" placeholder="z. B. Isolat Vanille, ESN" autocomplete="off" />
        </label>
        <label class="field">
          <span class="kicker">Shop</span>
          <select v-model="shop">
            <option value="all">Alle Shops</option>
            <option v-for="s in shopsWithOffers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <label class="field sort-mobile">
          <span class="kicker">Sortierung</span>
          <select
            :value="`${sort.key}:${sort.dir}`"
            @change="onSortSelect"
          >
            <option value="perKg:1">€/kg aufsteigend</option>
            <option value="price:1">Preis aufsteigend</option>
            <option value="price:-1">Preis absteigend</option>
            <option value="size:-1">Größte Packung</option>
            <option value="product:1">Produkt A–Z</option>
          </select>
        </label>
      </div>
      <p class="count" aria-live="polite">
        <span class="num">{{ visible.length }}</span> von <span class="num">{{ rows.length }}</span> Angeboten
      </p>
    </div>

    <table class="offers">
      <thead>
        <tr>
          <th
            v-for="key in COLUMNS"
            :key="key"
            :class="['col-' + key, { numeric: SORTS[key].numeric }]"
            :aria-sort="ariaSort(key)"
            scope="col"
          >
            <button type="button" @click="sortBy(key)">
              {{ SORTS[key].label }}
              <span class="sort-mark" aria-hidden="true">{{
                sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : '↕'
              }}</span>
            </button>
          </th>
          <th class="col-trend" scope="col">Verlauf</th>
          <th class="col-cmp" scope="col"><span class="sr-only">Vergleich</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in visible" :key="r.id">
          <td class="col-product">
            <NuxtLink :to="`/angebot/${toRouteId(r.id)}`" class="product-link">{{ r.product }}</NuxtLink>
            <span class="meta">
              <span class="cat">{{ CATEGORY_LABEL[r.category] }}</span>
              <span v-if="r.flavors > 1" class="flavors">{{ r.flavors }} Sorten</span>
              <span v-if="r.reduced" class="tag tag-reduced">Reduziert</span>
              <span v-if="r.isNew" class="tag tag-new">Neu</span>
            </span>
          </td>
          <td class="col-shop" :data-size="size(r.sizeG)">{{ shopName(r.shopId) }}</td>
          <td class="col-size numeric num">{{ size(r.sizeG) }}</td>
          <td class="col-price numeric">
            <span class="num">{{ euro(r.priceCents) }}</span>
            <s v-if="r.reduced && r.compareAtCents" class="num was">{{ euro(r.compareAtCents) }}</s>
          </td>
          <td class="col-perKg numeric num">{{ euro(r.perKgCents) }}</td>
          <td class="col-trend">
            <Sparkline :points="r.history" :direction="r.change?.direction ?? null" />
            <span v-if="r.change" class="delta" :data-dir="r.change.direction">{{ percent(r.change.pct) }}</span>
          </td>
          <td class="col-cmp">
            <button
              type="button"
              class="cmp"
              :class="pickLetter(r.id) && `pick-${pickLetter(r.id)}`"
              :aria-pressed="pickLetter(r.id) !== null"
              :aria-label="`${r.product}, ${shopName(r.shopId)}, ${size(r.sizeG)} vergleichen`"
              @click="$emit('toggle', r.id)"
            >
              <template v-if="pickLetter(r.id)"><span aria-hidden="true">✓</span> {{ pickLetter(r.id) }}</template>
              <template v-else><span aria-hidden="true">+</span> Vergleich</template>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="visible.length === 0" class="empty">
      <p>Nichts gefunden.</p>
      <button type="button" class="chip" @click="reset">Filter zurücksetzen</button>
    </div>
  </section>
</template>

<style scoped>
.filters {
  display: grid;
  gap: 16px;
  margin-bottom: 8px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 14px;
  border: 1px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: 500 14px/1 var(--font-text);
  cursor: pointer;
}

.chip .num {
  font-size: 12px;
  color: var(--ink-2);
}

.chip[aria-pressed='true'] {
  background: var(--ink);
  color: var(--paper);
}

.chip[aria-pressed='true'] .num {
  color: var(--paper);
  opacity: 0.7;
}

.chip-reduced[aria-pressed='true'] {
  background: var(--marker);
  color: var(--ink);
  border-color: var(--ink);
}

.chip:disabled {
  opacity: 0.35;
  cursor: default;
}

.controls {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 12px;
}

.field {
  display: grid;
  gap: 4px;
}

.field input,
.field select {
  width: 100%;
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid var(--rule);
  border-bottom: 2px solid var(--ink);
  border-radius: 0;
  background: var(--paper-2);
  color: var(--ink);
  font: 16px var(--font-text);
}

.sort-mobile {
  display: none;
}

.count {
  margin: 0;
  font-size: 13px;
  color: var(--ink-2);
}

.offers {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--paper);
  border-bottom: 2px solid var(--ink);
  text-align: left;
  padding: 0;
  font-weight: 500;
}

thead button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  width: 100%;
  padding: 12px 10px 8px;
  border: 0;
  background: none;
  color: var(--ink-2);
  font: 500 11px/1 var(--font-num);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}

th.numeric button {
  justify-content: flex-end;
}

th[aria-sort='ascending'] button,
th[aria-sort='descending'] button {
  color: var(--ink);
}

.sort-mark {
  font-size: 12px;
  opacity: 0.6;
}

.col-trend {
  font: 500 11px/1 var(--font-num);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-2);
}

tbody tr {
  border-bottom: 1px solid var(--rule);
}

tbody tr:hover {
  background: var(--paper-2);
}

td {
  padding: 12px 10px;
  vertical-align: middle;
}

td.numeric {
  text-align: right;
  white-space: nowrap;
}

.col-product {
  width: 40%;
}

.product-link {
  font-weight: 600;
  text-decoration: none;
  background-image: linear-gradient(var(--accent), var(--accent));
  background-size: 0 2px;
  background-position: 0 100%;
  background-repeat: no-repeat;
  transition: background-size 200ms ease;
}

.product-link:hover {
  background-size: 100% 2px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--ink-2);
}

.col-shop {
  color: var(--ink-2);
  white-space: nowrap;
}

.col-perKg {
  font-weight: 600;
}

.was {
  display: block;
  font-size: 12px;
  color: var(--ink-3);
}

td.col-trend {
  text-transform: none;
  letter-spacing: 0;
}

td.col-trend > * {
  display: inline-block;
  vertical-align: middle;
}

td.col-trend .delta {
  margin-left: 8px;
  font-size: 12px;
}

.col-cmp {
  width: 1%;
  text-align: right;
}

.cmp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 96px;
  min-height: 32px;
  padding: 4px 10px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: transparent;
  color: var(--ink-2);
  font: 500 11px/1 var(--font-num);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.cmp:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.cmp[aria-pressed='true'] {
  border-color: var(--tone);
  background: var(--tone);
  color: var(--paper);
  font-weight: 600;
}

.pick-A {
  --tone: var(--series-a);
}

.pick-B {
  --tone: var(--series-b);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.empty {
  padding: 40px 0;
  text-align: center;
  color: var(--ink-2);
}

@media (max-width: 760px) {
  .controls {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .search {
    grid-column: 1 / -1;
  }

  .sort-mobile {
    display: grid;
  }

  thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .offers,
  .offers tbody {
    display: block;
  }

  tbody tr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'product cmp'
      'shop trend'
      'price perkg';
    gap: 4px 12px;
    padding: 14px 0;
  }

  tbody tr:hover {
    background: none;
  }

  td {
    padding: 0;
  }

  .col-product {
    grid-area: product;
    width: auto;
  }

  .col-shop {
    grid-area: shop;
    font-size: 13px;
  }

  .col-size {
    display: none;
  }

  td.col-cmp {
    grid-area: cmp;
    width: auto;
    align-self: start;
  }

  .cmp {
    min-width: 0;
  }

  .col-shop::after {
    content: ' · ' attr(data-size);
  }

  td.col-trend {
    grid-area: trend;
    justify-self: end;
  }

  .col-price {
    grid-area: price;
    text-align: left !important;
  }

  .col-price .num:first-child {
    font-size: 17px;
  }

  .was {
    display: inline;
    margin-left: 6px;
  }

  .col-perKg {
    grid-area: perkg;
    align-self: end;
  }

  .col-perKg::after {
    content: '/kg';
    font-weight: 400;
    color: var(--ink-2);
  }
}
</style>
