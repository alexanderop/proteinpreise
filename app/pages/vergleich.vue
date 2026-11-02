<script setup lang="ts">
import { buildCatalog, type PricePoint } from '#shared/prices'
import { ROUTES, toRouteId } from '#shared/routes'
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

defineOgImage('Proteinpreise', {
  eyebrow: 'Vergleich',
  title: 'Zwei Pulver, ein Urteil.',
  note: 'Pro Kilo umgerechnet: welches günstiger ist und um wie viel',
})
</script>

<template>
  <UContainer>
    <header class="pt-12 pb-8 sm:pt-16">
      <p class="eyebrow mb-4">Gegenüberstellung<template v-if="catalog.date"> · Preise vom {{ day(catalog.date) }}</template></p>
      <template v-if="verdict && !verdict.tie">
        <h1 class="display max-w-[22ch] animate-rise text-title break-words text-highlighted">
          <span
            class="bg-[length:100%_0.09em] bg-[position:0_92%] bg-no-repeat"
            :class="verdict.side === 'a' ? 'bg-linear-to-r from-series-a to-series-a' : 'bg-linear-to-r from-series-b to-series-b'"
          >{{ verdict.winner.offer.product }}</span>{{ ' ' }}<span class="font-normal italic">von {{ verdict.winner.shop }}</span>
          ist pro Kilo <em class="font-display text-down not-italic">{{ share(verdict.pct) }}</em> günstiger.
        </h1>
        <p class="mt-5 max-w-[60ch] text-base text-muted sm:text-lg">
          <strong class="num text-highlighted">{{ euro(verdict.diff) }}</strong> weniger je Kilo Pulver als
          {{ verdict.loser.offer.product }} von {{ verdict.loser.shop
          }}<template v-if="verdict.winner.offer.sizeG !== verdict.loser.offer.sizeG">, auf das Kilo umgerechnet aus
            {{ size(verdict.winner.offer.sizeG) }} gegen {{ size(verdict.loser.offer.sizeG) }}</template>.
        </p>
      </template>
      <template v-else-if="verdict?.tie">
        <h1 class="display max-w-[22ch] animate-rise text-title text-highlighted">
          Gleichstand: beide kosten <em class="text-primary not-italic">{{ euro(verdict.perKg) }}</em> pro Kilo.
        </h1>
        <p class="mt-5 max-w-[60ch] text-lg text-muted">Pro Kilo Pulver nimmt sich keins etwas. Packungsgröße und Sortenwahl entscheiden.</p>
      </template>
      <template v-else-if="lone">
        <h1 class="display max-w-[22ch] animate-rise text-title break-words text-highlighted">
          {{ lone.entry.offer.product }} <em class="font-normal text-primary">gegen …?</em>
        </h1>
        <p class="mt-5 max-w-[60ch] text-lg text-muted">
          Wähle ein zweites Angebot. Oder nimm das günstigste
          {{ CATEGORY_LABEL[lone.entry.offer.category] }} pro Kilo als Gegner.
        </p>
        <UButton
          v-if="lone.rival"
          class="mt-5"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
          @click="choose(lone.side === 'a' ? 'b' : 'a', lone.rival.offer.id)"
        >
          Gegen {{ lone.rival.offer.product }}, {{ shopName(lone.rival.offer.shopId) }} antreten lassen
        </UButton>
      </template>
      <template v-else>
        <h1 class="display max-w-[22ch] animate-rise text-title text-highlighted">
          Zwei Pulver, <em class="font-normal text-primary">ein Urteil.</em>
        </h1>
        <p class="mt-5 max-w-[60ch] text-lg text-muted">
          Wähle zwei Angebote. Wir rechnen beide auf das Kilo um und sagen, welches günstiger ist und um wie viel.
        </p>
      </template>
    </header>

    <section
      class="grid items-stretch gap-4 transition-opacity md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-5"
      :class="{ 'opacity-0': !hydrated }"
      aria-label="Die beiden Angebote"
    >
      <CompareCard side="a" :state="slots.a" :standing="standings.a" @pick="picking = 'a'" />
      <div class="flex items-center justify-between gap-3 md:flex-col md:justify-center">
        <span class="font-display text-xl text-muted italic" aria-hidden="true">gegen</span>
        <UButton
          color="neutral"
          variant="outline"
          class="rounded-full"
          icon="i-lucide-arrow-left-right"
          :disabled="slots.a.kind === 'empty' && slots.b.kind === 'empty'"
          aria-label="Seiten tauschen"
          @click="swap"
        >
          Tausch
        </UButton>
      </div>
      <CompareCard side="b" :state="slots.b" :standing="standings.b" @pick="picking = 'b'" />
    </section>

    <template v-if="comparison && scale">
      <UCard class="mt-8" :ui="{ body: 'grid gap-3' }">
        <h2 class="eyebrow">Preis pro Kilo, nebeneinander</h2>
        <div v-for="s in (['a', 'b'] as const)" :key="s" class="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3">
          <span class="display text-xl" :class="s === 'a' ? 'text-series-a' : 'text-series-b'">{{ s.toUpperCase() }}</span>
          <span class="h-4 overflow-hidden rounded-full bg-elevated">
            <span
              class="block h-full origin-left animate-grow rounded-full"
              :class="s === 'a' ? 'bg-series-a' : 'bg-series-b'"
              :style="{ width: `${scale[s] * 100}%` }"
            />
          </span>
          <span class="num min-w-[7.5em] text-right text-lg font-semibold text-highlighted">{{ euro(comparison[s].current.perKgCents) }}</span>
        </div>
      </UCard>

      <section aria-labelledby="chart-title" class="mt-16">
        <SectionHead id="chart-title" title="Preis pro Kilo im Verlauf">Treppe: Preis gilt bis zum nächsten Abruf</SectionHead>
        <UCard>
          <PriceChart :series="chartSeries" metric="perKgCents" />
        </UCard>
      </section>

      <section aria-labelledby="facts-title" class="mt-16">
        <SectionHead id="facts-title" title="Im Einzelnen" />
        <UCard variant="outline" :ui="{ body: 'p-0 sm:p-0 overflow-x-auto' }">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-default">
                <th scope="col" class="w-[28%] p-3"><span class="sr-only">Kennzahl</span></th>
                <th v-for="s in (['a', 'b'] as const)" :key="s" scope="col" class="p-3 text-left align-bottom font-display text-base font-bold text-highlighted">
                  <span
                    class="mr-1.5 inline-grid size-5.5 place-items-center rounded text-xs font-extrabold text-inverted"
                    :class="s === 'a' ? 'bg-series-a' : 'bg-series-b'"
                  >{{ s.toUpperCase() }}</span>
                  {{ comparison[s].offer.product }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="row in facts" :key="row.label">
                <th scope="row" class="eyebrow p-3 text-left">{{ row.label }}</th>
                <td
                  v-for="s in (['a', 'b'] as const)"
                  :key="s"
                  class="num border-l border-default p-3"
                  :class="row.better === s ? 'font-semibold text-down' : 'text-default'"
                >
                  <UIcon v-if="row.better === s" name="i-lucide-trending-down" class="mr-1 size-3.5 align-[-0.125em]" />{{ row[s] }}
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>
        <p class="mt-3 text-sm text-muted">
          Pro Kilo Pulver, nicht pro Kilo Protein. Der Proteinanteil steht nicht in den Shop-Katalogen.
          <ULink :to="ROUTES.method" class="text-primary underline-offset-4 hover:underline">Mehr zur Methodik</ULink>
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
  </UContainer>
</template>
