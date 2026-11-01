<script setup lang="ts">
import { buildCatalog, toRouteId, type PricePoint } from '#shared/prices'
import { cheapestRival, compareOffers, resolveSlot, standing, type Side, type Slot } from '#shared/compare'
import { CATEGORY_LABEL } from '#shared/types'
import { day, euro, share, size } from '#shared/format'
import { shopName } from '#shared/shops'

const { data } = await useAsyncData('catalog', async () => buildCatalog(await loadSnapshots()))
const catalog = computed(() => data.value!)

const route = useRoute()
const router = useRouter()

// The page is prerendered once without a query, so the query is read only after hydration.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const param = (side: Side): string | null => {
  const value = hydrated.value ? route.query[side] : null
  return typeof value === 'string' && value ? value : null
}

const slots = computed<Record<Side, Slot>>(() => ({
  a: resolveSlot(catalog.value, param('a')),
  b: resolveSlot(catalog.value, param('b')),
}))

const offerId = (slot: Slot) => (slot.kind === 'offer' ? slot.entry.offer.id : null)

const comparison = computed(() => {
  const a = offerId(slots.value.a)
  const b = offerId(slots.value.b)
  return a && b ? compareOffers(catalog.value, a, b) : null
})

const standings = computed(() =>
  comparison.value ? { a: standing(comparison.value, 'a'), b: standing(comparison.value, 'b') } : { a: null, b: null },
)

const verdict = computed(() => {
  const c = comparison.value
  if (!c) return null
  if (c.cheaperPerKg === 'equal') return { tie: true as const, perKg: c.a.current.perKgCents }
  const side = c.cheaperPerKg
  return { tie: false as const, side, winner: c[side], loser: c[side === 'a' ? 'b' : 'a'], pct: c.pct, diff: c.diffPerKgCents }
})

const lone = computed(() => {
  if (comparison.value) return null
  const filled = (['a', 'b'] as const).find((s) => slots.value[s].kind === 'offer')
  if (!filled) return null
  const slot = slots.value[filled]
  if (slot.kind !== 'offer') return null
  return { side: filled, entry: slot.entry, rival: cheapestRival(catalog.value, slot.entry.offer.id) }
})

function setQuery(next: Record<Side, string | null>) {
  const query: Record<string, string> = {}
  if (next.a) query.a = next.a
  if (next.b) query.b = next.b
  router.replace({ query })
}

function choose(side: Side, id: string) {
  setQuery({ a: param('a'), b: param('b'), [side]: toRouteId(id) })
  picking.value = null
}

function swap() {
  setQuery({ a: param('b'), b: param('a') })
}

const picking = ref<Side | null>(null)
const pickerExclude = computed(() => {
  if (!picking.value) return null
  return offerId(slots.value[picking.value === 'a' ? 'b' : 'a'])
})

const scale = computed(() => {
  const c = comparison.value
  if (!c) return null
  const max = Math.max(c.a.current.perKgCents, c.b.current.perKgCents)
  return { a: c.a.current.perKgCents / max, b: c.b.current.perKgCents / max }
})

const chartSeries = computed(() => {
  const c = comparison.value
  if (!c) return []
  return (['a', 'b'] as const).map((s) => ({
    id: c[s].offer.id,
    label: `${s.toUpperCase()} · ${c[s].offer.product}`,
    points: c[s].series,
    tone: s,
  }))
})

const since = (series: PricePoint[]) =>
  `${day(series[0]!.date)} · ${series.length} ${series.length === 1 ? 'Messpunkt' : 'Messpunkte'}`

type FactRow = { label: string; a: string; b: string; better?: Side | null }

const facts = computed<FactRow[]>(() => {
  const c = comparison.value
  if (!c) return []
  const lower = (x: number, y: number): Side | null => (x === y ? null : x < y ? 'a' : 'b')
  return [
    { label: 'Preis pro Kilo', a: `${euro(c.a.current.perKgCents)}`, b: `${euro(c.b.current.perKgCents)}`, better: lower(c.a.current.perKgCents, c.b.current.perKgCents) },
    { label: 'Packungspreis', a: euro(c.a.current.priceCents), b: euro(c.b.current.priceCents) },
    { label: 'Packungsgröße', a: size(c.a.offer.sizeG), b: size(c.b.offer.sizeG) },
    { label: 'Sorten in dieser Größe', a: String(c.a.offer.flavors), b: String(c.b.offer.flavors) },
    { label: 'Tiefster Preis pro Kilo', a: `${euro(c.a.low.perKgCents)} · ${day(c.a.low.date)}`, b: `${euro(c.b.low.perKgCents)} · ${day(c.b.low.date)}`, better: lower(c.a.low.perKgCents, c.b.low.perKgCents) },
    { label: 'Höchster Preis pro Kilo', a: `${euro(c.a.high.perKgCents)} · ${day(c.a.high.date)}`, b: `${euro(c.b.high.perKgCents)} · ${day(c.b.high.date)}` },
    { label: 'Erfasst seit', a: since(c.a.series), b: since(c.b.series) },
    { label: 'Kategorie', a: CATEGORY_LABEL[c.a.offer.category], b: CATEGORY_LABEL[c.b.offer.category] },
  ]
})

useSeoMeta({
  title: 'Vergleich: zwei Proteinpulver pro Kilo gegenübergestellt',
  description: 'Zwei Proteinpulver-Angebote nebeneinander: Preis pro Kilo, Packung, Sorten und Preisverlauf.',
})
</script>

<template>
  <div class="wrap">
    <header class="hero">
      <p class="kicker">Gegenüberstellung<template v-if="catalog.date"> · Preise vom {{ day(catalog.date) }}</template></p>
      <template v-if="verdict && !verdict.tie">
        <h1>
          <span class="who" :class="`tone-${verdict.side}`">{{ verdict.winner.offer.product }}</span>{{ ' ' }}<span class="from">von {{ verdict.winner.shop }}</span>
          ist pro Kilo <em class="num">{{ share(verdict.pct) }}</em> günstiger.
        </h1>
        <p class="lede">
          <strong class="num">{{ euro(verdict.diff) }}</strong> weniger je Kilo Pulver als {{ verdict.loser.offer.product }}
          von {{ verdict.loser.shop }}<template v-if="verdict.winner.offer.sizeG !== verdict.loser.offer.sizeG">, auf das Kilo
          umgerechnet aus {{ size(verdict.winner.offer.sizeG) }} gegen {{ size(verdict.loser.offer.sizeG) }}</template>.
        </p>
      </template>
      <template v-else-if="verdict?.tie">
        <h1>Gleichstand: beide kosten <em class="num">{{ euro(verdict.perKg) }}</em> pro Kilo.</h1>
        <p class="lede">Pro Kilo Pulver nimmt sich keins etwas. Packungsgröße und Sortenwahl entscheiden.</p>
      </template>
      <template v-else-if="lone">
        <h1>{{ lone.entry.offer.product }} <em>gegen …?</em></h1>
        <p class="lede">
          Wähle ein zweites Angebot. Oder nimm das günstigste
          {{ CATEGORY_LABEL[lone.entry.offer.category] }} pro Kilo als Gegner.
        </p>
        <button
          v-if="lone.rival"
          type="button"
          class="suggest"
          @click="choose(lone.side === 'a' ? 'b' : 'a', lone.rival.offer.id)"
        >
          Gegen {{ lone.rival.offer.product }}, {{ shopName(lone.rival.offer.shopId) }} antreten lassen
        </button>
      </template>
      <template v-else>
        <h1>Zwei Pulver, <em>ein Urteil.</em></h1>
        <p class="lede">
          Wähle zwei Angebote. Wir rechnen beide auf das Kilo um und sagen, welches günstiger ist und um wie viel.
        </p>
      </template>
    </header>

    <section class="duel" :class="{ pending: !hydrated }" aria-label="Die beiden Angebote">
      <CompareCard side="a" :state="slots.a" :standing="standings.a" @pick="picking = 'a'" />
      <div class="versus">
        <span class="vs" aria-hidden="true">gegen</span>
        <button
          type="button"
          class="swap"
          :disabled="slots.a.kind === 'empty' && slots.b.kind === 'empty'"
          aria-label="Seiten tauschen"
          @click="swap"
        >
          <span aria-hidden="true">⇄</span> Tausch
        </button>
      </div>
      <CompareCard side="b" :state="slots.b" :standing="standings.b" @pick="picking = 'b'" />
    </section>

    <template v-if="comparison && scale">
      <section class="scale" aria-labelledby="scale-title">
        <h2 id="scale-title" class="kicker">Preis pro Kilo, nebeneinander</h2>
        <div v-for="s in (['a', 'b'] as const)" :key="s" class="bar-row" :class="`tone-${s}`">
          <span class="bar-letter">{{ s.toUpperCase() }}</span>
          <span class="bar-track">
            <span class="bar" :style="{ '--w': scale[s] }" />
          </span>
          <span class="bar-value num">{{ euro(comparison[s].current.perKgCents) }}</span>
        </div>
      </section>

      <section aria-labelledby="chart-title">
        <header class="section-head">
          <h2 id="chart-title">Preis pro Kilo im Verlauf</h2>
          <p class="kicker">Treppe: Preis gilt bis zum nächsten Abruf</p>
        </header>
        <PriceChart :series="chartSeries" metric="perKgCents" />
      </section>

      <section aria-labelledby="facts-title">
        <header class="section-head">
          <h2 id="facts-title">Im Einzelnen</h2>
        </header>
        <table class="facts">
          <thead>
            <tr>
              <th scope="col"><span class="sr-only">Kennzahl</span></th>
              <th scope="col" class="tone-a"><span class="th-letter">A</span> {{ comparison.a.offer.product }}</th>
              <th scope="col" class="tone-b"><span class="th-letter">B</span> {{ comparison.b.offer.product }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in facts" :key="row.label">
              <th scope="row">{{ row.label }}</th>
              <td class="num" :class="{ better: row.better === 'a' }">{{ row.a }}</td>
              <td class="num" :class="{ better: row.better === 'b' }">{{ row.b }}</td>
            </tr>
          </tbody>
        </table>
        <p class="footnote">
          Pro Kilo Pulver, nicht pro Kilo Protein. Der Proteinanteil steht nicht in den Shop-Katalogen.
          <NuxtLink to="/methodik">Mehr zur Methodik</NuxtLink>
        </p>
      </section>
    </template>

    <OfferPicker
      :entries="catalog.entries"
      :side="picking"
      :exclude="pickerExclude"
      @select="(id) => choose(picking!, id)"
      @close="picking = null"
    />
  </div>
</template>

<style scoped>
.hero {
  padding: clamp(32px, 6vw, 64px) 0 28px;
}

.hero .kicker {
  margin: 0 0 16px;
}

h1 {
  margin: 0;
  max-width: 22ch;
  font-family: var(--font-display);
  font-weight: 800;
  font-variation-settings: 'opsz' 144;
  font-size: clamp(34px, 6.4vw, 76px);
  line-height: 1;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
  animation: rise 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

h1 em {
  font-style: italic;
  font-weight: 400;
  color: var(--accent);
}

h1 em.num {
  font-family: var(--font-display);
  font-style: normal;
  font-weight: 800;
  color: var(--down);
}

.who {
  background-image: linear-gradient(var(--tone), var(--tone));
  background-size: 100% 0.09em;
  background-position: 0 92%;
  background-repeat: no-repeat;
}

.from {
  font-weight: 400;
  font-style: italic;
}

.tone-a {
  --tone: var(--series-a);
}

.tone-b {
  --tone: var(--series-b);
}

.lede {
  max-width: 60ch;
  margin: 20px 0 0;
  font-size: clamp(16px, 2vw, 19px);
  color: var(--ink-2);
}

.lede strong {
  color: var(--ink);
}

.suggest {
  margin-top: 20px;
  min-height: 44px;
  padding: 8px 18px;
  border: 0;
  background: var(--accent);
  color: var(--accent-ink);
  font: 600 15px var(--font-text);
  text-align: left;
  cursor: pointer;
}

.suggest:hover {
  filter: brightness(1.08);
}

.duel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 0 20px;
  transition: opacity 200ms ease;
}

.duel.pending {
  opacity: 0;
}

.versus {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.vs {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 22px;
  color: var(--ink-2);
}

.swap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 6px 14px;
  border: 1px solid var(--ink);
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink);
  font: 500 14px var(--font-text);
  cursor: pointer;
}

.swap span {
  font-size: 18px;
  line-height: 1;
}

.swap:hover:not(:disabled) {
  background: var(--ink);
  color: var(--paper);
}

.swap:disabled {
  opacity: 0.35;
  cursor: default;
}

.scale {
  display: grid;
  gap: 10px;
  margin-top: 36px;
  padding-top: 14px;
  border-top: 1px solid var(--ink);
}

.scale h2 {
  margin: 0 0 4px;
}

.bar-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.bar-letter {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  color: var(--tone);
}

.bar-track {
  height: 18px;
  background: var(--paper-2);
}

.bar {
  display: block;
  height: 100%;
  width: calc(var(--w) * 100%);
  background: var(--tone);
  border-radius: 0 4px 4px 0;
  transform-origin: left;
  animation: grow 700ms cubic-bezier(0.2, 0.7, 0.2, 1) both 150ms;
}

.bar-value {
  min-width: 7.5em;
  text-align: right;
  font-size: 18px;
  font-weight: 600;
}

@keyframes grow {
  from {
    transform: scaleX(0);
  }
}

.facts {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

.facts thead th {
  padding: 0 10px 10px;
  border-bottom: 2px solid var(--ink);
  text-align: left;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  vertical-align: bottom;
}

.th-letter {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-right: 6px;
  background: var(--tone);
  color: var(--paper);
  font-size: 13px;
  font-weight: 800;
}

.facts tbody th {
  padding: 11px 10px 11px 0;
  text-align: left;
  font-family: var(--font-num);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-2);
  width: 28%;
}

.facts td {
  padding: 11px 10px;
  border-left: 1px solid var(--rule);
  width: 36%;
}

.facts tbody tr {
  border-bottom: 1px solid var(--rule);
}

.facts td.better {
  font-weight: 600;
  color: var(--down);
}

.facts td.better::before {
  content: '▼ ';
  font-size: 0.8em;
}

.footnote {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--ink-2);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

@media (max-width: 760px) {
  .duel {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .versus {
    flex-direction: row;
    justify-content: space-between;
    padding: 12px 0;
  }

  .facts thead th {
    font-size: 14px;
  }

  .facts tbody th {
    width: 30%;
    font-size: 10px;
    letter-spacing: 0.06em;
  }

  .facts td {
    font-size: 13px;
    padding: 10px 6px;
  }
}
</style>
