<script setup lang="ts">
import { buildOverview, priceSeries } from '#shared/prices'
import { ROUTES, comparePath, fromRouteId, offerPath } from '#shared/routes'
import { CATEGORY_LABEL } from '#shared/types'
import { day, euro, percent, size } from '#shared/format'
import { shopName } from '#shared/shops'

const route = useRoute()
const id = fromRouteId(String(route.params.id)) ?? ''

const { data } = await useAsyncData(`offer:${id}`, async () => {
  const snapshots = await loadSnapshots()
  const series = priceSeries(snapshots, id)
  const offer = snapshots.findLast((s) => s.offers.some((o) => o.id === id))?.offers.find((o) => o.id === id)
  if (!offer || series.length === 0) return null
  const overview = buildOverview(snapshots)
  const row = overview.rows.find((r) => r.id === id) ?? null
  const slug = id.split(':')[1]
  const siblings = overview.rows
    .filter((r) => r.shopId === offer.shopId && r.id.split(':')[1] === slug && r.id !== id)
    .toSorted((a, b) => a.sizeG - b.sizeG)
  const peers = overview.rows
    .filter((r) => r.category === offer.category && r.id !== id)
    .toSorted((a, b) => a.perKgCents - b.perKgCents)
    .slice(0, 5)
  return { offer, series, row, latestDate: overview.date, siblings, peers }
})

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden', fatal: true })
}

const d = computed(() => data.value!)
const metric = ref<'priceCents' | 'perKgCents'>('priceCents')
const current = computed(() => d.value.series.at(-1)!)
const stats = computed(() => {
  const s = d.value.series
  const low = s.reduce((a, b) => (b.priceCents < a.priceCents ? b : a))
  const high = s.reduce((a, b) => (b.priceCents > a.priceCents ? b : a))
  return { low, high, first: s[0]! }
})
const listed = computed(() => d.value.row !== null)
const chartSeries = computed(() => [{ id: d.value.offer.id, label: d.value.offer.product, points: d.value.series, tone: 'accent' as const }])
const rival = computed(() => d.value.peers[0] ?? null)
const crumbs = computed(() => [
  { label: 'Übersicht', to: ROUTES.home },
  { label: CATEGORY_LABEL[d.value.offer.category] },
  { label: d.value.offer.product },
])
const facts = computed(() => [
  { label: 'Tiefster Preis', value: euro(stats.value.low.priceCents), note: day(stats.value.low.date) },
  { label: 'Höchster Preis', value: euro(stats.value.high.priceCents), note: day(stats.value.high.date) },
  {
    label: 'Erfasst seit',
    value: day(stats.value.first.date),
    note: `${d.value.series.length} ${d.value.series.length === 1 ? 'Messpunkt' : 'Messpunkte'}`,
  },
  { label: 'Sorten in dieser Größe', value: String(d.value.offer.flavors), note: 'Preis der günstigsten' },
])
const metricTabs = [
  { label: 'Preis', value: 'priceCents' },
  { label: '€/kg', value: 'perKgCents' },
]

useSeoMeta({
  title: () => `${d.value.offer.product} ${size(d.value.offer.sizeG)} bei ${shopName(d.value.offer.shopId)}: Preis & Verlauf`,
  description: () =>
    `${d.value.offer.brand} ${d.value.offer.product} (${size(d.value.offer.sizeG)}) kostet bei ${shopName(d.value.offer.shopId)} ${euro(current.value.priceCents)}, das sind ${euro(current.value.perKgCents)} pro Kilo. Preisverlauf seit ${day(stats.value.first.date)}.`,
})

defineOgImage('Proteinpreise', {
  eyebrow: `${shopName(d.value.offer.shopId)} · ${size(d.value.offer.sizeG)}`,
  title: d.value.offer.product,
  price: euro(current.value.priceCents),
  perKg: `${euro(current.value.perKgCents)}/kg`,
  note: `${d.value.offer.brand} · ${CATEGORY_LABEL[d.value.offer.category]}`,
  image: d.value.offer.image,
})

useSchemaOrg([
  defineProduct({
    name: d.value.offer.product,
    brand: { '@type': 'Brand', name: d.value.offer.brand },
    category: CATEGORY_LABEL[d.value.offer.category],
    image: d.value.offer.image ?? undefined,
    offers: {
      price: (current.value.priceCents / 100).toFixed(2),
      priceCurrency: 'EUR',
      url: d.value.offer.url,
      availability: listed.value ? 'https://schema.org/InStock' : 'https://schema.org/Discontinued',
      seller: { '@type': 'Organization', name: shopName(d.value.offer.shopId) },
    },
  }),
])
</script>

<template>
  <UContainer class="pt-8">
    <UBreadcrumb :items="crumbs" :ui="{ link: 'text-sm' }" />

    <header class="grid gap-8 pt-8 pb-4 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-center">
      <ProductImage :src="d.offer.image" :alt="d.offer.product" :width="240" eager class="aspect-square w-40 md:w-full" />
      <div>
        <p class="eyebrow">{{ shopName(d.offer.shopId) }} · {{ size(d.offer.sizeG) }} · {{ CATEGORY_LABEL[d.offer.category] }}</p>
        <h1 class="display mt-3 mb-5 max-w-[20ch] animate-rise text-title break-words text-highlighted">{{ d.offer.product }}</h1>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span class="num text-5xl font-semibold text-highlighted">{{ euro(current.priceCents) }}</span>
          <span class="num text-lg text-muted">{{ euro(current.perKgCents) }}/kg</span>
          <UBadge v-if="d.row?.reduced" size="lg" class="bg-marker text-marker-text">
            Reduziert, statt {{ euro(d.offer.compareAtCents!) }}
          </UBadge>
          <PriceDelta v-if="d.row?.change" :pct="d.row.change.pct" :direction="d.row.change.direction" size="md">
            <span class="font-normal">seit {{ day(d.row.change.previousDate) }}</span>
          </PriceDelta>
        </div>
        <UAlert
          v-if="!listed"
          class="mt-4"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="`Am ${day(d.latestDate!)} nicht mehr im Katalog`"
          :description="`Zuletzt gesehen am ${day(current.date)}.`"
        />
        <div class="mt-6 flex flex-wrap items-stretch gap-3">
          <UButton
            :to="d.offer.url"
            target="_blank"
            rel="noopener nofollow"
            size="xl"
            trailing-icon="i-lucide-external-link"
          >
            Zum Shop: {{ shopName(d.offer.shopId) }}
          </UButton>
          <NuxtLink
            v-if="rival"
            :to="comparePath(d.offer.id, rival.id)"
            class="group grid min-w-0 gap-px rounded-md px-4 py-2 ring ring-accented transition hover:bg-elevated"
          >
            <span class="eyebrow">Vergleichen mit</span>
            <span class="font-semibold break-words text-highlighted group-hover:text-primary">
              {{ rival.product }}, {{ shopName(rival.shopId) }}
            </span>
            <span class="num text-xs text-muted">günstigstes {{ CATEGORY_LABEL[d.offer.category] }} · {{ euro(rival.perKgCents) }}/kg</span>
          </NuxtLink>
        </div>
      </div>
    </header>

    <section aria-labelledby="chart-title" class="mt-12">
      <SectionHead id="chart-title" title="Preisverlauf">
        <template #aside>
          <UTabs v-model="metric" :items="metricTabs" :content="false" size="xs" aria-label="Kennzahl" />
        </template>
      </SectionHead>
      <UCard>
        <PriceChart :series="chartSeries" :metric="metric" />
      </UCard>
      <dl class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div v-for="f in facts" :key="f.label" class="rounded-lg bg-surface p-4 shadow-card ring ring-default">
          <dt class="eyebrow">{{ f.label }}</dt>
          <dd class="num mt-1.5 text-xl font-semibold text-highlighted">{{ f.value }}</dd>
          <dd class="text-sm text-muted">{{ f.note }}</dd>
        </div>
      </dl>
    </section>

    <div class="mt-16 grid gap-x-10 gap-y-16 lg:grid-cols-2">
      <section v-if="d.siblings.length" aria-labelledby="sizes-title">
        <SectionHead id="sizes-title" title="Andere Größen" />
        <UCard variant="outline" :ui="{ body: 'p-0 sm:p-0' }">
          <ul class="divide-y divide-default">
            <li v-for="r in d.siblings" :key="r.id">
              <NuxtLink
                :to="offerPath(r.id)"
                class="grid grid-cols-[minmax(0,1fr)_auto_minmax(7.5em,auto)] items-baseline gap-4 px-4 py-3 text-right transition hover:bg-elevated/60"
              >
                <span class="text-left font-medium text-highlighted">{{ size(r.sizeG) }}</span>
                <span class="num text-muted">{{ euro(r.priceCents) }}</span>
                <span class="num font-semibold text-highlighted">{{ euro(r.perKgCents) }}/kg</span>
              </NuxtLink>
            </li>
          </ul>
        </UCard>
      </section>
      <section aria-labelledby="peers-title">
        <SectionHead id="peers-title" title="Pro Kilo am günstigsten">{{ CATEGORY_LABEL[d.offer.category] }}</SectionHead>
        <UCard variant="outline" :ui="{ body: 'p-0 sm:p-0' }">
          <ol class="divide-y divide-default">
            <li v-for="(r, i) in d.peers" :key="r.id">
              <NuxtLink
                :to="offerPath(r.id)"
                class="group flex items-center gap-3 px-4 py-3 transition hover:bg-elevated/60"
              >
                <span class="num w-4 text-sm text-dimmed">{{ i + 1 }}</span>
                <ProductImage :src="r.image" :alt="r.product" :width="44" class="size-11" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium text-highlighted group-hover:text-primary">{{ r.product }}</span>
                  <span class="block text-xs text-muted">{{ shopName(r.shopId) }} · {{ size(r.sizeG) }}</span>
                </span>
                <span class="num font-semibold whitespace-nowrap text-highlighted">{{ euro(r.perKgCents) }}/kg</span>
              </NuxtLink>
            </li>
          </ol>
        </UCard>
      </section>
    </div>
  </UContainer>
</template>
