<script setup lang="ts">
import type { Side, Slot, Standing } from '#shared/compare'
import { isReduced, toRouteId } from '#shared/prices'
import { CATEGORY_LABEL } from '#shared/types'
import { day, euro, share, size } from '#shared/format'
import { shopName } from '#shared/shops'

const props = defineProps<{ side: Side; state: Slot; standing: Standing | null }>()
defineEmits<{ pick: [] }>()

const current = computed(() => (props.state.kind === 'offer' ? props.state.entry.series.at(-1)! : null))
</script>

<template>
  <article class="card" :class="[`side-${side}`, `kind-${state.kind}`, standing && `is-${standing.role}`]">
    <span class="letter" aria-hidden="true">{{ side.toUpperCase() }}</span>

    <template v-if="state.kind === 'offer'">
      <p class="kicker">
        {{ shopName(state.entry.offer.shopId) }} · {{ size(state.entry.offer.sizeG) }} ·
        {{ CATEGORY_LABEL[state.entry.offer.category] }}
      </p>
      <h2 class="name">
        <NuxtLink :to="`/angebot/${toRouteId(state.entry.offer.id)}`">{{ state.entry.offer.product }}</NuxtLink>
      </h2>
      <p class="perkg num">{{ euro(current!.perKgCents) }}<span>/kg</span></p>
      <p class="pack num">{{ euro(current!.priceCents) }} für {{ size(state.entry.offer.sizeG) }}</p>
      <p class="marks">
        <span v-if="standing?.role === 'cheaper'" class="delta" data-dir="down">
          <span aria-hidden="true">▼</span> {{ share(standing.pct) }} günstiger pro Kilo
        </span>
        <span v-else-if="standing?.role === 'dearer'" class="delta" data-dir="up">
          <span aria-hidden="true">▲</span> {{ euro(standing.diffPerKgCents) }} mehr pro Kilo
        </span>
        <span v-else-if="standing?.role === 'equal'" class="delta">= gleich teuer pro Kilo</span>
        <span v-if="state.entry.listed && isReduced(state.entry.offer)" class="tag tag-reduced">Reduziert</span>
        <span v-if="!state.entry.listed" class="tag tag-gone">Nicht mehr gelistet, zuletzt {{ day(current!.date) }}</span>
      </p>
      <div class="card-actions">
        <button type="button" class="swap-side" @click="$emit('pick')">Anderes Angebot</button>
        <a :href="state.entry.offer.url" rel="noopener nofollow" target="_blank" class="shop">
          Zum Shop <span aria-hidden="true">↗</span>
        </a>
      </div>
    </template>

    <div v-else class="vacant">
      <p class="vacant-title">
        {{ state.kind === 'unknown' ? 'Dieses Angebot kennen wir nicht.' : `Angebot ${side.toUpperCase()}` }}
      </p>
      <p class="vacant-text">
        {{
          state.kind === 'unknown'
            ? 'Der Link zeigt auf ein Angebot, das in keinem Abruf vorkommt. Wähle ein anderes.'
            : 'Noch leer. Wähle ein Proteinpulver aus allen aktuellen Angeboten.'
        }}
      </p>
      <button type="button" class="choose" @click="$emit('pick')">Angebot wählen</button>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 22px 22px 20px;
  border-top: 6px solid var(--tone);
  background: var(--paper-2);
  animation: rise 500ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.side-a {
  --tone: var(--series-a);
}

.side-b {
  --tone: var(--series-b);
  animation-delay: 90ms;
}

.letter {
  position: absolute;
  top: 14px;
  right: 18px;
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 800;
  font-variation-settings: 'opsz' 144;
  line-height: 1;
  color: var(--tone);
  opacity: 0.9;
}

.kicker {
  margin: 0;
  padding-right: 48px;
}

.name {
  margin: 4px 0 0;
  padding-right: 40px;
  font-family: var(--font-display);
  font-weight: 700;
  font-variation-settings: 'opsz' 72;
  font-size: clamp(24px, 3.2vw, 34px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.name a {
  text-decoration: none;
}

.name a:hover {
  text-decoration: underline;
  text-decoration-color: var(--tone);
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

.perkg {
  margin: 14px 0 0;
  font-size: clamp(36px, 5.5vw, 52px);
  font-weight: 600;
  line-height: 1;
}

.perkg span {
  font-size: 0.42em;
  font-weight: 500;
  color: var(--ink-2);
}

.pack {
  margin: 0;
  font-size: 14px;
  color: var(--ink-2);
}

.marks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  min-height: 24px;
  margin: 8px 0 0;
  font-size: 14px;
}

.tag-gone {
  background: var(--up-bg);
  color: var(--ink);
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  margin-top: auto;
  padding-top: 16px;
}

.swap-side,
.choose {
  min-height: 40px;
  padding: 6px 16px;
  border: 1px solid var(--ink);
  background: transparent;
  color: var(--ink);
  font: 500 14px var(--font-text);
  cursor: pointer;
}

.swap-side:hover,
.choose:hover {
  background: var(--ink);
  color: var(--paper);
}

.shop {
  font-size: 14px;
  color: var(--ink-2);
}

.kind-empty,
.kind-unknown {
  border-top-style: dashed;
  background: transparent;
  outline: 1px dashed var(--rule);
  outline-offset: -1px;
}

.vacant {
  display: grid;
  gap: 8px;
  justify-items: start;
  padding-right: 48px;
}

.vacant-title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(24px, 3.2vw, 32px);
  line-height: 1.1;
}

.vacant-text {
  margin: 0;
  max-width: 36ch;
  font-family: var(--font-display);
  font-style: italic;
  color: var(--ink-2);
}

.choose {
  margin-top: 8px;
  background: var(--ink);
  color: var(--paper);
}

.choose:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}
</style>
