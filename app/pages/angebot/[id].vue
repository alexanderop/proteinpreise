<script setup lang="ts">
import { buildOverview, fromRouteId, priceSeries, toRouteId } from '#shared/prices'
import { CATEGORY_LABEL } from '#shared/types'
import { day, euro, percent, size } from '#shared/format'
import { shopName } from '#shared/shops'

const route = useRoute()
const id = fromRouteId(String(route.params.id))

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

useSeoMeta({
  title: () => `${d.value.offer.product} ${size(d.value.offer.sizeG)} bei ${shopName(d.value.offer.shopId)}: Preisverlauf`,
  description: () =>
    `${d.value.offer.product} (${size(d.value.offer.sizeG)}) kostet ${euro(current.value.priceCents)}, ${euro(current.value.perKgCents)} pro kg. Preisverlauf seit ${day(stats.value.first.date)}.`,
})
</script>

<template>
  <div class="wrap">
    <nav class="crumbs kicker"><NuxtLink to="/">Übersicht</NuxtLink> / {{ CATEGORY_LABEL[d.offer.category] }}</nav>

    <header class="head">
      <p class="kicker">{{ shopName(d.offer.shopId) }} · {{ size(d.offer.sizeG) }} · {{ CATEGORY_LABEL[d.offer.category] }}</p>
      <h1>{{ d.offer.product }}</h1>
      <div class="price-line">
        <span class="price num">{{ euro(current.priceCents) }}</span>
        <span class="perkg num">{{ euro(current.perKgCents) }}/kg</span>
        <span v-if="d.row?.reduced" class="tag tag-reduced">Reduziert, statt {{ euro(d.offer.compareAtCents!) }}</span>
        <span v-if="d.row?.change" class="delta" :data-dir="d.row.change.direction">
          <span aria-hidden="true">{{ d.row.change.direction === 'down' ? '▼' : '▲' }}</span>
          {{ percent(d.row.change.pct) }} seit {{ day(d.row.change.previousDate) }}
        </span>
      </div>
      <p v-if="!listed" class="gone">
        Am {{ day(d.latestDate!) }} nicht mehr im Katalog. Zuletzt gesehen am {{ day(current.date) }}.
      </p>
      <a :href="d.offer.url" class="shop-link" rel="noopener nofollow" target="_blank">
        Zum Shop: {{ shopName(d.offer.shopId) }} <span aria-hidden="true">↗</span>
      </a>
    </header>

    <section class="chart-section" aria-labelledby="chart-title">
      <header class="section-head">
        <h2 id="chart-title">Preisverlauf</h2>
        <div class="seg" role="group" aria-label="Kennzahl">
          <button type="button" :aria-pressed="metric === 'priceCents'" @click="metric = 'priceCents'">Preis</button>
          <button type="button" :aria-pressed="metric === 'perKgCents'" @click="metric = 'perKgCents'">€/kg</button>
        </div>
      </header>
      <PriceChart :points="d.series" :metric="metric" />
      <dl class="facts">
        <div>
          <dt>Tiefster Preis</dt>
          <dd class="num">{{ euro(stats.low.priceCents) }}</dd>
          <dd class="when">{{ day(stats.low.date) }}</dd>
        </div>
        <div>
          <dt>Höchster Preis</dt>
          <dd class="num">{{ euro(stats.high.priceCents) }}</dd>
          <dd class="when">{{ day(stats.high.date) }}</dd>
        </div>
        <div>
          <dt>Erfasst seit</dt>
          <dd class="num">{{ day(stats.first.date) }}</dd>
          <dd class="when">{{ d.series.length }} {{ d.series.length === 1 ? 'Messpunkt' : 'Messpunkte' }}</dd>
        </div>
        <div>
          <dt>Sorten in dieser Größe</dt>
          <dd class="num">{{ d.offer.flavors }}</dd>
          <dd class="when">Preis der günstigsten</dd>
        </div>
      </dl>
    </section>

    <div class="related">
      <section v-if="d.siblings.length" aria-labelledby="sizes-title">
        <header class="section-head">
          <h2 id="sizes-title">Andere Größen</h2>
        </header>
        <ul class="list sizes">
          <li v-for="r in d.siblings" :key="r.id">
            <NuxtLink :to="`/angebot/${toRouteId(r.id)}`">
              <span>{{ size(r.sizeG) }}</span>
              <span class="num">{{ euro(r.priceCents) }}</span>
              <span class="num strong">{{ euro(r.perKgCents) }}/kg</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
      <section aria-labelledby="peers-title">
        <header class="section-head">
          <h2 id="peers-title">Pro Kilo am günstigsten</h2>
          <p class="kicker">{{ CATEGORY_LABEL[d.offer.category] }}</p>
        </header>
        <ul class="list">
          <li v-for="r in d.peers" :key="r.id">
            <NuxtLink :to="`/angebot/${toRouteId(r.id)}`">
              <span>
                {{ r.product }}
                <small>{{ shopName(r.shopId) }} · {{ size(r.sizeG) }}</small>
              </span>
              <span class="num strong">{{ euro(r.perKgCents) }}/kg</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.crumbs {
  margin: 28px 0 0;
}

.crumbs a {
  text-decoration: none;
  color: var(--ink);
}

.head {
  padding: 28px 0 8px;
}

h1 {
  margin: 10px 0 18px;
  max-width: 20ch;
  font-family: var(--font-display);
  font-weight: 800;
  font-variation-settings: 'opsz' 144;
  font-size: clamp(36px, 7vw, 72px);
  line-height: 0.98;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}

.price-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 18px;
}

.price {
  font-size: clamp(32px, 6vw, 48px);
  font-weight: 600;
}

.perkg {
  font-size: 18px;
  color: var(--ink-2);
}

.gone {
  margin: 12px 0 0;
  padding: 8px 12px;
  background: var(--up-bg);
  font-size: 14px;
}

.shop-link {
  display: inline-flex;
  gap: 8px;
  margin-top: 22px;
  padding: 12px 18px;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
  text-decoration: none;
}

.shop-link:hover {
  filter: brightness(1.08);
}

.seg {
  display: inline-flex;
  border: 1px solid var(--ink);
}

.seg button {
  min-height: 34px;
  padding: 4px 14px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: 500 13px var(--font-num);
  cursor: pointer;
}

.seg button[aria-pressed='true'] {
  background: var(--ink);
  color: var(--paper);
}

.facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 24px 0 0;
  border-top: 1px solid var(--ink);
}

.facts div {
  padding: 14px 14px 0 0;
}

.facts dt {
  font-family: var(--font-num);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-2);
}

.facts dd {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 600;
}

.facts .when {
  font-size: 13px;
  font-weight: 400;
  color: var(--ink-2);
}

.related {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 0 40px;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li + li {
  border-top: 1px solid var(--rule);
}

.list a {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding: 12px 0;
  text-decoration: none;
}

.sizes a {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(7.5em, auto);
  text-align: right;
}

.sizes a span:first-child {
  text-align: left;
}

.list a:hover {
  color: var(--accent);
}

.list small {
  display: block;
  color: var(--ink-2);
  font-size: 12.5px;
}

.strong {
  font-weight: 600;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .facts {
    grid-template-columns: 1fr 1fr;
    row-gap: 12px;
  }
}
</style>
