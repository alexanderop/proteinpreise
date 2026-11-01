<script setup lang="ts">
import type { CatalogEntry } from '#shared/prices'
import type { Side } from '#shared/compare'
import { CATEGORIES, CATEGORY_LABEL, type Category } from '#shared/types'
import { euro, size } from '#shared/format'
import { shopName } from '#shared/shops'

const props = defineProps<{ entries: CatalogEntry[]; side: Side | null; exclude: string | null }>()
const emit = defineEmits<{ select: [id: string]; close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const search = ref<HTMLInputElement | null>(null)
const query = ref('')
const category = ref<Category | 'all'>('all')

watch(
  () => props.side,
  async (side) => {
    if (side) {
      query.value = ''
      dialog.value?.showModal()
      await nextTick()
      search.value?.focus()
    } else if (dialog.value?.open) {
      dialog.value.close()
    }
  },
)

const options = computed(() =>
  props.entries
    .filter((e) => e.listed && e.offer.id !== props.exclude)
    .map((e) => ({ ...e.offer, shop: shopName(e.offer.shopId), perKgCents: e.series.at(-1)!.perKgCents }))
    .toSorted((a, b) => a.perKgCents - b.perKgCents),
)

const groups = computed(() => {
  const terms = query.value.toLowerCase().split(/\s+/).filter(Boolean)
  const hits = options.value.filter((o) => {
    if (category.value !== 'all' && o.category !== category.value) return false
    const haystack = `${o.product} ${o.shop} ${CATEGORY_LABEL[o.category]}`.toLowerCase()
    return terms.every((t) => haystack.includes(t))
  })
  return CATEGORIES.map((c) => ({ category: c, items: hits.filter((o) => o.category === c) })).filter((g) => g.items.length)
})

const hitCount = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))

function onBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) dialog.value?.close()
}
</script>

<template>
  <dialog ref="dialog" class="picker" :class="side && `side-${side}`" @close="emit('close')" @click="onBackdrop">
    <div class="sheet">
      <header class="picker-head">
        <p class="kicker">
          <span class="letter">{{ side?.toUpperCase() }}</span> Angebot wählen
        </p>
        <button type="button" class="close" aria-label="Schließen" @click="dialog?.close()">×</button>
      </header>
      <label class="field">
        <span class="sr-only">Suche</span>
        <input
          ref="search"
          v-model="query"
          type="search"
          placeholder="Produkt oder Shop, z. B. Clear Whey, Rühl"
          autocomplete="off"
        />
      </label>
      <div class="chips" role="group" aria-label="Kategorie">
        <button type="button" class="chip" :aria-pressed="category === 'all'" @click="category = 'all'">Alle</button>
        <button
          v-for="c in CATEGORIES"
          :key="c"
          type="button"
          class="chip"
          :aria-pressed="category === c"
          @click="category = c"
        >
          {{ CATEGORY_LABEL[c] }}
        </button>
      </div>
      <p class="count kicker" aria-live="polite">{{ hitCount }} Angebote, pro Kilo aufsteigend</p>
      <div class="results">
        <section v-for="g in groups" :key="g.category" class="group">
          <h3 class="group-title">{{ CATEGORY_LABEL[g.category] }}</h3>
          <ul>
            <li v-for="o in g.items" :key="o.id">
              <button type="button" class="option" @click="emit('select', o.id)">
                <span class="option-name">
                  {{ o.product }}
                  <small>{{ o.shop }} · {{ size(o.sizeG) }} · {{ euro(o.priceCents) }}</small>
                </span>
                <span class="option-kg num">{{ euro(o.perKgCents) }}<small>/kg</small></span>
              </button>
            </li>
          </ul>
        </section>
        <p v-if="hitCount === 0" class="none">Nichts gefunden. Anderer Suchbegriff?</p>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.picker {
  width: min(640px, calc(100vw - 32px));
  max-height: min(760px, calc(100dvh - 48px));
  margin: auto;
  padding: 0;
  border: 1px solid var(--ink);
  background: var(--paper);
  color: var(--ink);
  box-shadow: 8px 8px 0 color-mix(in oklab, var(--ink) 18%, transparent);
}

.picker::backdrop {
  background: color-mix(in oklab, var(--paper) 40%, rgb(0 0 0 / 0.55));
  backdrop-filter: blur(2px);
}

.picker[open] {
  animation: rise 220ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: inherit;
  padding: 18px 18px 0;
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 3px solid var(--tone);
  padding-top: 10px;
}

.side-a {
  --tone: var(--series-a);
}

.side-b {
  --tone: var(--series-b);
}

.picker-head .kicker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--ink);
}

.letter {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  background: var(--tone);
  color: var(--paper);
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0;
}

.close {
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.field input {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--rule);
  border-bottom: 2px solid var(--ink);
  border-radius: 0;
  background: var(--paper-2);
  color: var(--ink);
  font: 16px var(--font-text);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  min-height: 32px;
  padding: 4px 12px;
  border: 1px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: 500 13px/1 var(--font-text);
  cursor: pointer;
}

.chip[aria-pressed='true'] {
  background: var(--ink);
  color: var(--paper);
}

.count {
  margin: 0;
}

.results {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0 -18px;
  padding: 0 18px 18px;
  border-top: 1px solid var(--rule);
}

.group-title {
  position: sticky;
  top: 0;
  margin: 0;
  padding: 12px 0 6px;
  background: var(--paper);
  border-bottom: 1px solid var(--ink);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
}

.group ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.group li + li {
  border-top: 1px solid var(--rule);
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  width: 100%;
  padding: 10px 6px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.option:hover,
.option:focus-visible {
  background: var(--paper-2);
}

.option-name {
  min-width: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.option small {
  display: block;
  font-weight: 400;
  font-size: 12.5px;
  color: var(--ink-2);
}

.option-kg {
  font-weight: 600;
  white-space: nowrap;
}

.option-kg small {
  display: inline;
  color: var(--ink-2);
}

.none {
  padding: 24px 0;
  font-family: var(--font-display);
  font-style: italic;
  color: var(--ink-2);
}

@media (max-width: 520px) {
  .picker {
    width: 100vw;
    max-width: 100vw;
    max-height: 88dvh;
    margin: auto 0 0;
    border-width: 1px 0 0;
    box-shadow: none;
  }
}
</style>
