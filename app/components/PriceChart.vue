<script setup lang="ts">
import { area, bisector, curveStepAfter, extent, line, scaleLinear, scaleUtc } from 'd3'
import type { PricePoint } from '#shared/prices'
import { day, euro, parseDay, shortDay } from '#shared/format'

type Metric = 'priceCents' | 'perKgCents'

const props = defineProps<{ points: PricePoint[]; metric: Metric }>()

const HEIGHT = 320
const M = { top: 20, right: 20, bottom: 34, left: 68 }
const DAY_MS = 86_400_000

const container = ref<HTMLElement | null>(null)
const width = ref(760)
const hover = ref<number | null>(null)

let observer: ResizeObserver | undefined
onMounted(() => {
  if (!container.value) return
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = Math.max(280, Math.round(entry.contentRect.width))
  })
  observer.observe(container.value)
})
onBeforeUnmount(() => observer?.disconnect())

const format = (cents: number) => (props.metric === 'perKgCents' ? `${euro(cents)}/kg` : euro(cents))

const chart = computed(() => {
  const { points, metric } = props
  const w = width.value
  const compact = w < 480
  const left = compact ? 56 : M.left
  const innerRight = w - M.right
  const innerBottom = HEIGHT - M.bottom
  const dates = points.map((p) => parseDay(p.date))
  const [first, last] = extent(dates) as [Date, Date]
  const span = last.getTime() - first.getTime()
  const tail = new Date(last.getTime() + Math.max(DAY_MS, span * 0.04))
  const xDomain: [Date, Date] =
    span === 0 ? [new Date(first.getTime() - 3 * DAY_MS), new Date(first.getTime() + 3 * DAY_MS)] : [first, tail]
  const x = scaleUtc().domain(xDomain).range([left, innerRight])

  const [lo, hi] = extent(points, (p) => p[metric]) as [number, number]
  const pad = Math.max((hi - lo) * 0.25, hi * 0.08)
  const y = scaleLinear()
    .domain([Math.max(0, lo - pad), hi + pad])
    .range([innerBottom, M.top])
    .nice(5)

  const px = (p: PricePoint) => x(parseDay(p.date))
  const py = (p: PricePoint) => y(p[metric])
  const steps: [number, number][] = points.map((p) => [px(p), py(p)])
  const lastPoint = points.at(-1)!
  steps.push([x(tail), py(lastPoint)])

  return {
    left,
    innerRight,
    innerBottom,
    x,
    y,
    px,
    py,
    linePath: points.length > 1 ? line().curve(curveStepAfter)(steps) : null,
    areaPath: points.length > 1 ? area().y0(innerBottom).curve(curveStepAfter)(steps) : null,
    yTicks: y.ticks(compact ? 4 : 5),
    xTicks: span === 0 ? [first] : x.ticks(Math.min(points.length, Math.floor(w / 110))).filter((t) => t <= last),
  }
})

const active = computed(() => (hover.value === null ? null : props.points[hover.value] ?? null))
const latest = computed(() => props.points.at(-1) ?? null)
const shown = computed(() => active.value ?? latest.value)

const findIndex = bisector((p: PricePoint) => parseDay(p.date).getTime()).center

function onMove(event: PointerEvent) {
  const svg = event.currentTarget as SVGSVGElement
  const box = svg.getBoundingClientRect()
  const xPos = ((event.clientX - box.left) / box.width) * width.value
  const date = chart.value.x.invert(xPos).getTime()
  hover.value = findIndex(props.points, date)
}

const tickLabel = (value: number) =>
  props.metric === 'perKgCents' ? `${Math.round(value / 100)} €` : `${(value / 100).toLocaleString('de-DE')} €`
</script>

<template>
  <figure ref="container" class="chart">
    <figcaption class="readout" aria-live="polite">
      <template v-if="shown">
        <span class="readout-value num">{{ format(shown[metric]) }}</span>
        <span class="readout-date">{{ hover === null ? 'aktuell, ' : '' }}{{ day(shown.date) }}</span>
      </template>
    </figcaption>
    <svg
      :viewBox="`0 0 ${width} ${HEIGHT}`"
      :width="width"
      :height="HEIGHT"
      class="chart-svg"
      role="img"
      :aria-label="`Preisverlauf, ${points.length} Messpunkte`"
      @pointermove="onMove"
      @pointerleave="hover = null"
    >
      <g class="grid">
        <g v-for="t in chart.yTicks" :key="`y${t}`">
          <line :x1="chart.left" :x2="chart.innerRight" :y1="chart.y(t)" :y2="chart.y(t)" />
          <text :x="chart.left - 10" :y="chart.y(t)" dy="0.32em" text-anchor="end" class="num">{{ tickLabel(t) }}</text>
        </g>
        <g v-for="t in chart.xTicks" :key="`x${t.getTime()}`">
          <text :x="chart.x(t)" :y="chart.innerBottom + 22" text-anchor="middle" class="num">{{
            shortDay(t.toISOString().slice(0, 10))
          }}</text>
        </g>
        <line class="axis" :x1="chart.left" :x2="chart.innerRight" :y1="chart.innerBottom" :y2="chart.innerBottom" />
      </g>

      <path v-if="chart.areaPath" :d="chart.areaPath" class="area" />
      <path v-if="chart.linePath" :d="chart.linePath" class="line" />

      <g v-if="points.length === 1" class="single">
        <line
          :x1="chart.left"
          :x2="chart.innerRight"
          :y1="chart.py(points[0]!)"
          :y2="chart.py(points[0]!)"
          class="single-rule"
        />
        <text :x="chart.px(points[0]!)" :y="chart.py(points[0]!) - 18" text-anchor="middle" class="single-note">
          Verlauf startet am {{ day(points[0]!.date) }}
        </text>
      </g>

      <circle
        v-for="(p, i) in points"
        :key="p.date"
        :cx="chart.px(p)"
        :cy="chart.py(p)"
        :r="points.length === 1 ? 6 : i === points.length - 1 ? 4.5 : 2.5"
        class="dot"
        :class="{ last: i === points.length - 1 }"
      />

      <g v-if="active" class="hover" pointer-events="none">
        <line :x1="chart.px(active)" :x2="chart.px(active)" :y1="20" :y2="chart.innerBottom" />
        <circle :cx="chart.px(active)" :cy="chart.py(active)" r="6" />
      </g>

      <rect
        :x="chart.left"
        :y="0"
        :width="Math.max(0, chart.innerRight - chart.left)"
        :height="HEIGHT"
        fill="transparent"
      />
    </svg>
    <div v-if="active" class="tip" :style="{ left: `clamp(72px, ${(chart.px(active) / width) * 100}%, calc(100% - 72px))` }">
      <strong>{{ day(active.date) }}</strong>
      <span class="num">{{ euro(active.priceCents) }}</span>
      <span class="num">{{ euro(active.perKgCents) }}/kg</span>
    </div>
  </figure>
</template>

<style scoped>
.chart {
  position: relative;
  margin: 0;
  width: 100%;
}

.readout {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  min-height: 44px;
  margin-bottom: 8px;
}

.readout-value {
  font-size: clamp(26px, 5vw, 36px);
  font-weight: 600;
}

.readout-date {
  color: var(--ink-2);
  font-size: 14px;
}

.chart-svg {
  display: block;
  width: 100%;
  height: auto;
  touch-action: pan-y;
  cursor: crosshair;
}

.grid line {
  stroke: var(--rule);
  stroke-width: 1;
}

.grid .axis {
  stroke: var(--ink);
}

.grid text {
  fill: var(--ink-2);
  font-size: 11px;
}

.area {
  fill: var(--chart-fill);
}

.line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.25;
  stroke-linejoin: round;
}

.dot {
  fill: var(--paper);
  stroke: var(--accent);
  stroke-width: 2;
}

.dot.last {
  fill: var(--accent);
}

.single-rule {
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 3 5;
  opacity: 0.6;
}

.single-note {
  fill: var(--ink-2);
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
}

.hover line {
  stroke: var(--ink);
  stroke-width: 1;
  stroke-dasharray: 2 3;
}

.hover circle {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.5;
}

.tip {
  position: absolute;
  top: 56px;
  transform: translateX(-50%);
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  background: var(--ink);
  color: var(--paper);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  border-radius: 2px;
}
</style>
