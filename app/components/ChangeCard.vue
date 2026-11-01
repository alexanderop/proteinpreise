<script setup lang="ts">
import type { ChangedRow } from '#shared/prices'
import { toRouteId } from '#shared/prices'
import { euro, percent, size } from '#shared/format'
import { shopName } from '#shared/shops'

const props = defineProps<{ row: ChangedRow }>()
const dir = computed(() => props.row.change.direction)
</script>

<template>
  <NuxtLink :to="`/angebot/${toRouteId(row.id)}`" class="card" :data-dir="dir">
    <div class="card-top">
      <span class="kicker">{{ shopName(row.shopId) }} · {{ size(row.sizeG) }}</span>
      <span class="delta" :data-dir="dir">
        <span aria-hidden="true">{{ dir === 'down' ? '▼' : '▲' }}</span>{{ percent(row.change.pct) }}
      </span>
    </div>
    <h3>{{ row.product }}</h3>
    <div class="prices">
      <s class="num old">{{ euro(row.change.fromCents) }}</s>
      <span class="arrow" aria-hidden="true">→</span>
      <span class="num new">{{ euro(row.change.toCents) }}</span>
    </div>
    <div class="card-foot">
      <span class="num">{{ euro(row.perKgCents) }}/kg</span>
      <Sparkline :points="row.history" :direction="dir" :width="80" :height="22" />
    </div>
  </NuxtLink>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 16px 14px;
  text-decoration: none;
  background: var(--paper-2);
  border-top: 4px solid var(--ink);
  transition: transform 160ms ease, background 160ms ease;
}

.card[data-dir='down'] {
  border-top-color: var(--down);
}

.card[data-dir='up'] {
  border-top-color: var(--up);
}

.card:hover {
  background: var(--paper-3);
  transform: translateY(-2px);
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

h3 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-variation-settings: 'opsz' 36;
  font-size: 19px;
  line-height: 1.2;
}

.prices {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.old {
  color: var(--ink-3);
  font-size: 15px;
}

.arrow {
  color: var(--ink-3);
}

.new {
  font-size: 24px;
  font-weight: 600;
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-top: auto;
  font-size: 13px;
  color: var(--ink-2);
}
</style>
