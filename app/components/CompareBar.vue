<script setup lang="ts">
import type { OfferRow } from '#shared/prices'
import { toRouteId } from '#shared/prices'
import { euro, size } from '#shared/format'
import { shopName } from '#shared/shops'

const props = defineProps<{ picks: OfferRow[] }>()
defineEmits<{ remove: [id: string]; clear: [] }>()

const LETTERS = ['A', 'B'] as const
const slots = computed(() => LETTERS.map((letter, i) => ({ letter, row: props.picks[i] ?? null })))
const target = computed(() => {
  const [a, b] = props.picks
  return a && b ? { path: '/vergleich', query: { a: toRouteId(a.id), b: toRouteId(b.id) } } : null
})
</script>

<template>
  <aside class="bar" aria-label="Auswahl zum Vergleichen">
    <div class="wrap bar-row">
      <ol class="picks">
        <li v-for="s in slots" :key="s.letter" :class="[`pick-${s.letter}`, { vacant: !s.row }]">
          <span class="letter" aria-hidden="true">{{ s.letter }}</span>
          <template v-if="s.row">
            <span class="pick-text">
              <span class="pick-name">{{ s.row.product }}</span>
              <span class="pick-meta num">{{ shopName(s.row.shopId) }} · {{ size(s.row.sizeG) }} · {{ euro(s.row.perKgCents) }}/kg</span>
            </span>
            <button type="button" class="remove" :aria-label="`${s.row.product} entfernen`" @click="$emit('remove', s.row.id)">
              ×
            </button>
          </template>
          <span v-else class="pick-hint">Noch ein Angebot wählen</span>
        </li>
      </ol>
      <div class="go">
        <NuxtLink v-if="target" :to="target" class="go-btn">Vergleichen <span aria-hidden="true">→</span></NuxtLink>
        <span v-else class="go-btn is-disabled" aria-disabled="true">Vergleichen</span>
        <button type="button" class="clear" @click="$emit('clear')">Leeren</button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.bar {
  position: fixed;
  inset: auto 0 0;
  z-index: 50;
  border-top: 3px solid var(--ink);
  background: var(--paper);
  box-shadow: 0 -10px 30px color-mix(in oklab, var(--ink) 12%, transparent);
  padding-bottom: env(safe-area-inset-bottom);
  animation: slide 260ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

@keyframes slide {
  from {
    transform: translateY(100%);
  }
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 12px 20px;
  padding-top: 10px;
  padding-bottom: 10px;
}

.picks {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.picks li {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 48px;
  padding: 4px 4px 4px 0;
  border-left: 4px solid var(--tone);
  padding-left: 10px;
}

.pick-A {
  --tone: var(--series-a);
}

.pick-B {
  --tone: var(--series-b);
}

.picks li.vacant {
  border-left-style: dashed;
}

.letter {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  color: var(--tone);
}

.pick-text {
  display: grid;
  min-width: 0;
}

.pick-name,
.pick-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-name {
  font-weight: 600;
  font-size: 14px;
}

.pick-meta {
  font-size: 12px;
  color: var(--ink-2);
}

.pick-hint {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 14px;
  color: var(--ink-2);
}

.remove {
  flex: none;
  width: 32px;
  height: 32px;
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--ink-2);
  font-size: 20px;
  cursor: pointer;
}

.remove:hover {
  color: var(--ink);
}

.go {
  display: flex;
  align-items: center;
  gap: 8px;
}

.go-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 18px;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.go-btn:hover {
  filter: brightness(1.08);
}

.go-btn.is-disabled {
  background: var(--paper-3);
  color: var(--ink-3);
}

.clear {
  min-height: 44px;
  padding: 6px 10px;
  border: 0;
  background: transparent;
  color: var(--ink-2);
  font: 500 13px var(--font-text);
  text-decoration: underline;
  cursor: pointer;
}

@media (max-width: 640px) {
  .bar-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .picks {
    gap: 6px;
  }

  .picks li {
    min-height: 40px;
    padding-left: 8px;
    gap: 6px;
  }

  .letter {
    font-size: 18px;
  }

  .pick-name {
    font-size: 13px;
  }

  .pick-meta {
    font-size: 11px;
  }

  .remove {
    width: 28px;
  }

  .go-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
