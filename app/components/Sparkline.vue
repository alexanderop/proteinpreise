<script setup lang="ts">
import { curveStepAfter, extent, line, scaleLinear, scaleUtc } from 'd3'
import type { PricePoint } from '#shared/prices'
import { parseDay } from '#shared/format'

const props = withDefaults(
  defineProps<{ points: PricePoint[]; direction?: 'up' | 'down' | null; width?: number; height?: number }>(),
  { direction: null, width: 96, height: 26 },
)

const PAD = 3

const geometry = computed(() => {
  const { points, width, height } = props
  if (points.length === 0) return null
  const dates = points.map((p) => parseDay(p.date))
  const [minDate, maxDate] = extent(dates) as [Date, Date]
  const [lo, hi] = extent(points, (p) => p.priceCents) as [number, number]
  const x = scaleUtc()
    .domain(minDate.getTime() === maxDate.getTime() ? [minDate, new Date(minDate.getTime() + 1)] : [minDate, maxDate])
    .range([PAD, width - PAD])
  const y = scaleLinear()
    .domain(lo === hi ? [lo * 0.9, hi * 1.1] : [lo, hi])
    .range([height - PAD, PAD])
  const last = points.at(-1)!
  const lastX = points.length === 1 ? width - PAD : x(parseDay(last.date))
  const path =
    points.length > 1
      ? line<PricePoint>()
          .x((p) => x(parseDay(p.date)))
          .y((p) => y(p.priceCents))
          .curve(curveStepAfter)(points)
      : null
  return { path, lastX, lastY: y(last.priceCents), baseline: y(points[0]!.priceCents) }
})
</script>

<template>
  <svg
    class="spark"
    :data-dir="direction"
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    role="img"
    :aria-label="points.length > 1 ? `Preisverlauf über ${points.length} Tage` : 'Erster Messpunkt'"
  >
    <template v-if="geometry">
      <line
        v-if="!geometry.path"
        :x1="PAD"
        :x2="width - PAD"
        :y1="geometry.baseline"
        :y2="geometry.baseline"
        class="spark-base"
      />
      <path v-if="geometry.path" :d="geometry.path" class="spark-line" />
      <circle :cx="geometry.lastX" :cy="geometry.lastY" r="2.6" class="spark-dot" />
    </template>
  </svg>
</template>

<style scoped>
.spark {
  display: block;
  overflow: visible;
}

.spark-line {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.4;
}

.spark-base {
  stroke: var(--rule);
  stroke-width: 1;
  stroke-dasharray: 2 3;
}

.spark-dot {
  fill: var(--ink);
}

.spark[data-dir='down'] .spark-dot {
  fill: var(--down);
}

.spark[data-dir='up'] .spark-dot {
  fill: var(--up);
}
</style>
