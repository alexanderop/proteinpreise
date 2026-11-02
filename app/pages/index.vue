<script setup lang="ts">
import { buildOverview, type OfferRow } from '#shared/prices'
import { offerPath } from '#shared/routes'
import { CATEGORIES, CATEGORY_LABEL } from '#shared/types'
import { day, euro } from '#shared/format'
import { shopName } from '#shared/shops'
import { toggleSelection } from '#shared/compare'

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
const drops = computed(() => ov.value.changes.filter((c) => c.change.direction === 'down').length)

const CARD_LIMIT = 8
const showAllChanges = ref(false)
const shownChanges = computed(() => (showAllChanges.value ? ov.value.changes : ov.value.changes.slice(0, CARD_LIMIT)))

const lows = computed(() =>
  CATEGORIES.flatMap((category) => {
    const best = ov.value.rows
      .filter((r) => r.category === category)
      .reduce<OfferRow | null>((min, r) => (!min || r.perKgCents < min.perKgCents ? r : min), null)
    return best ? [{ category, row: best }] : []
  }),
)

const stats = computed(() => [
  { label: 'Angebote', value: ov.value.rows.length },
  { label: 'Shops', value: shopsOk.value.length },
  {
    label: ov.value.previousDate ? `Änderungen seit ${day(ov.value.previousDate)}` : 'Änderungen',
    value: ov.value.changes.length,
    accent: true,
  },
])

const selected = ref<string[]>([])
const picks = computed(() => selected.value.flatMap((id) => ov.value.rows.find((r) => r.id === id) ?? []))
const toggle = (id: string) => {
  selected.value = toggleSelection(selected.value, id)
}

useSeoMeta({
  title: 'Proteinpulver-Preise deutscher Shops im Vergleich',
  description: () =>
    `${ov.value.rows.length} Proteinpulver-Angebote aus ${shopsOk.value.length} deutschen Shops, täglich aktualisiert, pro Kilo umgerechnet, mit Preisverlauf.`,
})

defineOgImage('Proteinpreise', {
  eyebrow: ov.value.date ? `Ausgabe ${day(ov.value.date)}` : '',
  title: 'Was Proteinpulver heute kostet.',
  note: `${ov.value.rows.length} Angebote aus ${shopsOk.value.length} Shops, pro Kilo verglichen`,
})
</script>

<template>
  <UContainer v-if="ov.date">
    <section class="grid gap-10 pt-12 pb-10 sm:pt-20 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end">
      <div>
        <p class="eyebrow mb-5 flex items-center gap-2">
          <span class="relative flex size-2">
            <span class="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span class="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          Ausgabe vom {{ dateline }}
        </p>
        <h1 class="display max-w-[13ch] animate-rise text-hero text-highlighted">
          Was Proteinpulver <em class="pr-[0.08em] font-normal text-primary">heute</em> kostet.
        </h1>
        <p class="mt-6 max-w-[52ch] text-base text-muted sm:text-lg">
          Jeden Morgen lesen wir die Kataloge deutscher Supplement-Shops und rechnen jeden Preis auf das Kilo um. Was
          sich seit dem letzten Abruf bewegt hat, steht oben.
        </p>
      </div>

      <dl class="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-(--ui-border) ring ring-default">
        <div
          v-for="(s, i) in stats"
          :key="s.label"
          class="animate-rise bg-surface p-5"
          :class="{ 'col-span-2': s.accent }"
          :style="{ animationDelay: `${120 + i * 90}ms` }"
        >
          <dt class="eyebrow">{{ s.label }}</dt>
          <dd class="num mt-2 text-5xl leading-none font-medium" :class="s.accent ? 'text-primary' : 'text-highlighted'">
            {{ s.value }}
          </dd>
          <dd v-if="s.accent && ov.changes.length" class="mt-2 text-sm text-muted">
            <span class="font-semibold text-down">{{ drops }} günstiger</span>,
            <span class="font-semibold text-up">{{ ov.changes.length - drops }} teurer</span>
          </dd>
        </div>
      </dl>
    </section>

    <section aria-labelledby="lows-title">
      <h2 id="lows-title" class="eyebrow mb-3">Tiefstwert je Kategorie, pro Kilo Pulver</h2>
      <ol class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <li
          v-for="({ category, row }, i) in lows"
          :key="category"
          class="animate-rise last:odd:col-span-2 md:last:odd:col-span-1"
          :style="{ animationDelay: `${300 + i * 70}ms` }"
        >
          <NuxtLink
            :to="offerPath(row.id)"
            class="group flex h-full flex-col gap-1.5 rounded-lg bg-surface p-4 shadow-card ring ring-default transition hover:ring-primary/60"
          >
            <span class="flex items-start justify-between gap-2">
              <span class="text-sm font-semibold text-toned">{{ CATEGORY_LABEL[category] }}</span>
              <ProductImage :src="row.image" :alt="row.product" :width="44" class="size-11" />
            </span>
            <span class="num text-2xl font-semibold text-highlighted group-hover:text-primary">
              {{ euro(row.perKgCents) }}<span class="text-sm font-normal text-dimmed">/kg</span>
            </span>
            <span class="mt-auto text-xs leading-snug text-muted">{{ row.product }}, {{ shopName(row.shopId) }}</span>
          </NuxtLink>
        </li>
      </ol>
    </section>

    <section aria-labelledby="changes-title" class="mt-16">
      <SectionHead id="changes-title" title="Preisänderungen">
        <template v-if="ov.previousDate">
          gegenüber {{ day(ov.previousDate) }}
          <template v-if="ov.gone.length"> · {{ ov.gone.length }} nicht mehr gelistet</template>
        </template>
      </SectionHead>
      <template v-if="ov.changes.length">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          <ChangeCard v-for="row in shownChanges" :key="row.id" :row="row" />
        </div>
        <div v-if="ov.changes.length > CARD_LIMIT" class="mt-6 flex justify-center">
          <UButton
            color="neutral"
            variant="outline"
            :trailing-icon="showAllChanges ? 'i-lucide-minus' : 'i-lucide-plus'"
            @click="showAllChanges = !showAllChanges"
          >
            {{ showAllChanges ? 'Weniger zeigen' : `Alle ${ov.changes.length} Änderungen zeigen` }}
          </UButton>
        </div>
      </template>
      <EmptyNote v-else>
        <template v-if="ov.previousDate">
          Kein Preis hat sich seit {{ day(ov.previousDate) }} bewegt. Ruhiger Tag am Pulvermarkt.
        </template>
        <template v-else>
          Die Aufzeichnung beginnt am {{ day(ov.firstDate!) }}. Ab dem nächsten Abruf erscheinen hier alle Preise, die
          sich verändert haben, mit altem und neuem Preis.
        </template>
      </EmptyNote>
    </section>

    <section aria-labelledby="all-title" class="mt-16">
      <SectionHead id="all-title" title="Alle Angebote">günstigster Geschmack je Packung</SectionHead>
      <UAlert
        v-if="shopsFailed.length"
        class="mb-4"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="`Heute nicht erreichbar: ${shopsFailed.map((s) => shopName(s.shopId)).join(', ')}`"
        :description="`Diese Angebote fehlen für ${day(ov.date)}.`"
      />
      <OfferBrowser :rows="ov.rows" :selected="selected" @toggle="toggle" />
    </section>

    <template v-if="picks.length">
      <div class="h-32" aria-hidden="true" />
      <CompareBar :picks="picks" @remove="toggle" @clear="selected = []" />
    </template>
  </UContainer>
  <UContainer v-else class="py-16">
    <EmptyNote>Noch keine Daten. Führe <code>node scripts/scrape.ts</code> aus.</EmptyNote>
  </UContainer>
</template>
