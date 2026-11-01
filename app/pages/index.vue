<script setup lang="ts">
import { buildOverview, toRouteId, type OfferRow } from '#shared/prices'
import { CATEGORIES, CATEGORY_LABEL } from '#shared/types'
import { day, euro } from '#shared/format'
import { shopName } from '#shared/shops'

const { data: overview } = await useAsyncData('overview', async () => buildOverview(await loadSnapshots()))

const LONG_DATE = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const ov = computed(() => overview.value!)
const shopsOk = computed(() => ov.value.shops.filter((s) => s.ok))
const shopsFailed = computed(() => ov.value.shops.filter((s) => !s.ok))
const dateline = computed(() => (ov.value.date ? LONG_DATE.format(new Date(`${ov.value.date}T00:00:00Z`)) : ''))

const lows = computed(() =>
  CATEGORIES.flatMap((category) => {
    const best = ov.value.rows
      .filter((r) => r.category === category)
      .reduce<OfferRow | null>((min, r) => (!min || r.perKgCents < min.perKgCents ? r : min), null)
    return best ? [{ category, row: best }] : []
  }),
)

useSeoMeta({
  title: 'Proteinpreise: Proteinpulver-Preise deutscher Shops im Vergleich',
  description: () =>
    `${ov.value.rows.length} Proteinpulver-Angebote aus ${shopsOk.value.length} deutschen Shops, täglich aktualisiert, mit Preisverlauf.`,
})
</script>

<template>
  <div v-if="ov.date" class="wrap">
    <section class="hero">
      <p class="kicker dateline">Ausgabe vom {{ dateline }}</p>
      <h1>Was Proteinpulver <em>heute</em> kostet.</h1>
      <p class="lede">
        Jeden Morgen lesen wir die Kataloge deutscher Supplement-Shops und rechnen jeden Preis auf das Kilo um. Was
        sich seit dem letzten Abruf bewegt hat, steht oben.
      </p>
      <dl class="stats">
        <div class="stat" style="--i: 0">
          <dt>Angebote</dt>
          <dd class="num">{{ ov.rows.length }}</dd>
        </div>
        <div class="stat" style="--i: 1">
          <dt>Shops</dt>
          <dd class="num">{{ shopsOk.length }}</dd>
        </div>
        <div class="stat stat-accent" style="--i: 2">
          <dt>{{ ov.previousDate ? `Preisänderungen seit ${day(ov.previousDate)}` : 'Preisänderungen seit gestern' }}</dt>
          <dd class="num">{{ ov.changes.length }}</dd>
        </div>
      </dl>
    </section>

    <section class="lows" aria-labelledby="lows-title">
      <h2 id="lows-title" class="kicker">Tiefstwert je Kategorie, pro Kilo Pulver</h2>
      <ol class="board">
        <li v-for="({ category, row }, i) in lows" :key="category" :style="{ '--i': i }">
          <NuxtLink :to="`/angebot/${toRouteId(row.id)}`">
            <span class="board-cat">{{ CATEGORY_LABEL[category] }}</span>
            <span class="board-value num">{{ euro(row.perKgCents) }}</span>
            <span class="board-who">{{ row.product }}, {{ shopName(row.shopId) }}</span>
          </NuxtLink>
        </li>
      </ol>
    </section>

    <section aria-labelledby="changes-title">
      <header class="section-head">
        <h2 id="changes-title">Preisänderungen</h2>
        <p v-if="ov.previousDate" class="kicker">
          gegenüber {{ day(ov.previousDate) }}
          <template v-if="ov.gone.length"> · {{ ov.gone.length }} nicht mehr gelistet</template>
        </p>
      </header>
      <div v-if="ov.changes.length" class="cards">
        <ChangeCard v-for="row in ov.changes" :key="row.id" :row="row" />
      </div>
      <div v-else class="quiet">
        <p v-if="ov.previousDate">
          Kein Preis hat sich seit {{ day(ov.previousDate) }} bewegt. Ruhiger Tag am Pulvermarkt.
        </p>
        <p v-else>
          Die Aufzeichnung beginnt am {{ day(ov.firstDate!) }}. Ab dem nächsten Abruf erscheinen hier alle Preise, die
          sich verändert haben, mit altem und neuem Preis.
        </p>
      </div>
    </section>

    <section aria-labelledby="all-title">
      <header class="section-head">
        <h2 id="all-title">Alle Angebote</h2>
        <p class="kicker">günstigster Geschmack je Packung</p>
      </header>
      <p v-if="shopsFailed.length" class="warn">
        Heute nicht erreichbar: {{ shopsFailed.map((s) => shopName(s.shopId)).join(', ') }}. Diese Angebote fehlen
        für {{ day(ov.date) }}.
      </p>
      <OfferBrowser :rows="ov.rows" />
    </section>
  </div>
  <div v-else class="wrap quiet">
    <p>Noch keine Daten. Führe <code>node scripts/scrape.ts</code> aus.</p>
  </div>
</template>

<style scoped>
.hero {
  padding: clamp(36px, 7vw, 80px) 0 32px;
}

.dateline {
  margin: 0 0 18px;
}

h1 {
  margin: 0;
  max-width: 14ch;
  font-family: var(--font-display);
  font-weight: 800;
  font-variation-settings: 'opsz' 144;
  font-size: clamp(44px, 9vw, 104px);
  line-height: 0.95;
  letter-spacing: -0.035em;
  animation: rise 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

h1 em {
  padding-right: 0.12em;
  font-weight: 400;
  color: var(--accent);
}

.lede {
  max-width: 52ch;
  margin: 22px 0 0;
  font-size: clamp(16px, 2vw, 18px);
  color: var(--ink-2);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 40px 0 0;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}

.stat {
  padding: 16px 16px 18px 0;
  animation: rise 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
  animation-delay: calc(120ms + var(--i) * 90ms);
}

.stat + .stat {
  padding-left: 16px;
  border-left: 1px solid var(--rule);
}

.stat dt {
  font-family: var(--font-num);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-2);
}

.stat dd {
  margin: 6px 0 0;
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 500;
  line-height: 1;
}

.stat-accent dd {
  color: var(--accent);
}

.lows {
  margin-top: 28px;
}

.lows h2 {
  margin: 0 0 12px;
}

.board {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--rule);
  border: 1px solid var(--rule);
}

.board li {
  background: var(--paper);
  animation: rise 500ms ease both;
  animation-delay: calc(300ms + var(--i) * 70ms);
}

.board a {
  display: grid;
  gap: 4px;
  height: 100%;
  padding: 14px;
  text-decoration: none;
}

.board a:hover {
  background: var(--paper-2);
}

.board-cat {
  font-size: 13px;
  font-weight: 600;
}

.board-value {
  font-size: 22px;
  font-weight: 600;
}

.board-who {
  font-size: 12px;
  color: var(--ink-2);
  line-height: 1.35;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.quiet {
  padding: 28px 24px;
  border: 1px dashed var(--rule);
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(18px, 2.4vw, 22px);
  line-height: 1.4;
  color: var(--ink-2);
}

.quiet p {
  margin: 0;
  max-width: 56ch;
}

.warn {
  padding: 10px 14px;
  background: var(--up-bg);
  font-size: 14px;
}

@media (max-width: 860px) {
  .board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .board li:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .stats {
    grid-template-columns: 1fr 1fr;
  }

  .stat-accent {
    grid-column: 1 / -1;
    padding-left: 0 !important;
    border-left: 0 !important;
    border-top: 1px solid var(--rule);
  }
}
</style>
