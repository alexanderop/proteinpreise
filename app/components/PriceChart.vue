<script lang="ts">
import type { PricePoint } from '#shared/prices'

export interface ChartSeries {
  id: string
  label: string
  points: PricePoint[]
  tone: 'accent' | 'a' | 'b'
}
</script>

<script setup lang="ts">
import { area, bisector, curveStepAfter, line, scaleLinear, scaleUtc } from 'd3'
import { day, euro, parseDay, shortDay } from '#shared/format'

type Metric = 'priceCents' | 'perKgCents'

const props = defineProps<{ series: ChartSeries[]; metric: Metric }>()

const HEIGHT = 320
const M = { top: 20, right: 20, bottom: 34, left: 68 }
const DAY_MS = 86_400_000
const TONE: Record<ChartSeries['tone'], string> = {
  accent: 'var(--accent)',
  a: 'var(--series-a)',
  b: 'var(--series-b)',
}

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

const dates = computed(() => [...new Set(props.series.flatMap((s) => s.points.map((p) => p.date)))].toSorted())
const lastDate = computed(() => dates.value.at(-1)!)

function valueAt(points: PricePoint[], date: string): PricePoint | null {
  const end = points.at(-1)!
  if (date > end.date && end.date < lastDate.value) return null
  return points.findLast((p) => p.date <= date) ?? null
}

const chart = computed(() => {
  const { series, metric } = props
  const w = width.value
  const compact = w < 480
  const left = compact ? 56 : M.left
  const innerRight = w - M.right
  const innerBottom = HEIGHT - M.bottom
  const first = parseDay(dates.value[0]!)
  const last = parseDay(lastDate.value)
  const span = last.getTime() - first.getTime()
  const tail = new Date(last.getTime() + Math.max(DAY_MS, span * 0.04))
  const xDomain: [Date, Date] =
    span === 0 ? [new Date(first.getTime() - 3 * DAY_MS), new Date(first.getTime() + 3 * DAY_MS)] : [first, tail]
  const x = scaleUtc().domain(xDomain).range([left, innerRight])

  const values = series.flatMap((s) => s.points.map((p) => p[metric]))
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.25, hi * 0.08)
  const y = scaleLinear()
    .domain([Math.max(0, lo - pad), hi + pad])
    .range([innerBottom, M.top])
    .nice(5)

  const px = (p: PricePoint) => x(parseDay(p.date))
  const py = (p: PricePoint) => y(p[metric])
  const allSingle = series.every((s) => s.points.length === 1)

  const drawn = series.map((s) => {
    const end = s.points.at(-1)!
    const stop = end.date === lastDate.value ? tail : new Date(parseDay(end.date).getTime() + DAY_MS)
    const steps: [number, number][] = s.points.map((p) => [px(p), py(p)])
    steps.push([x(stop), py(end)])
    return {
      ...s,
      color: TONE[s.tone],
      linePath: allSingle ? null : line().curve(curveStepAfter)(steps),
      areaPath: series.length === 1 && s.points.length > 1 ? area().y0(innerBottom).curve(curveStepAfter)(steps) : null,
    }
  })

  const top = series
    .map((s) => s.points[0]!)
    .reduce((a, b) => (b[metric] > a[metric] ? b : a))

  return {
    left,
    innerRight,
    innerBottom,
    x,
    y,
    px,
    py,
    drawn,
    allSingle,
    note: allSingle && span === 0 ? top : null,
    yTicks: y.ticks(compact ? 4 : 5),
    xTicks: span === 0 ? [first] : x.ticks(Math.min(dates.value.length, Math.floor(w / 110))).filter((t) => t <= last),
  }
})

const activeDate = computed(() => (hover.value === null ? null : dates.value[hover.value] ?? null))
const readings = computed(() =>
  props.series.map((s) => ({
    ...s,
    color: TONE[s.tone],
    point: activeDate.value ? valueAt(s.points, activeDate.value) : s.points.at(-1)!,
  })),
)
const single = computed(() => (props.series.length === 1 ? readings.value[0]! : null))

const tipX = computed(() => (activeDate.value ? chart.value.x(parseDay(activeDate.value)) / width.value : 0))

const findIndex = bisector((d: string) => parseDay(d).getTime()).center

function onMove(event: PointerEvent) {
  const svg = event.currentTarget as SVGSVGElement
  const box = svg.getBoundingClientRect()
  const xPos = ((event.clientX - box.left) / box.width) * width.value
  hover.value = findIndex(dates.value, chart.value.x.invert(xPos).getTime())
}

const tickLabel = (value: number) =>
  props.metric === 'perKgCents' ? `${Math.round(value / 100)} €` : `${(value / 100).toLocaleString('de-DE')} €`
</script>

<template>
  <figure ref="container" class="chart">
    <figcaption class="readout" aria-live="polite">
      <template v-if="single?.point">
        <span class="readout-value num">{{ format(single.point[metric]) }}</span>
        <span class="readout-date">{{ activeDate === null ? 'aktuell, ' : '' }}{{ day(single.point.date) }}</span>
      </template>
      <ul v-else-if="!single" class="legend">
        <li v-for="r in readings" :key="r.id" :style="{ '--tone': r.color }">
          <svg class="swatch" :class="`tone-${r.tone}`" width="22" height="12" aria-hidden="true">
            <line x1="1" x2="21" y1="6" y2="6" />
            <rect v-if="r.tone === 'b'" x="7" y="2" width="8" height="8" />
            <circle v-else cx="11" cy="6" r="4" />
          </svg>
          <span class="legend-label">{{ r.label }}</span>
          <span class="legend-value num">{{ r.point ? format(r.point[metric]) : 'nicht gelistet' }}</span>
        </li>
        <li class="legend-date">{{ activeDate === null ? 'aktuell' : day(activeDate) }}</li>
      </ul>
    </figcaption>
    <svg
      :viewBox="`0 0 ${width} ${HEIGHT}`"
      :width="width"
      :height="HEIGHT"
      class="chart-svg"
      role="img"
      :aria-label="
        single
          ? `Preisverlauf, ${single.points.length} Messpunkte`
          : `Verlauf pro Kilo: ${series.map((s) => s.label).join(' und ')}`
      "
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

      <g v-for="s in chart.drawn" :key="s.id" class="series" :class="`tone-${s.tone}`" :style="{ '--tone': s.color }">
        <path v-if="s.areaPath" :d="s.areaPath" class="area" />
        <path v-if="s.linePath" :d="s.linePath" class="line" />
        <line
          v-if="chart.allSingle"
          :x1="chart.left"
          :x2="chart.innerRight"
          :y1="chart.py(s.points[0]!)"
          :y2="chart.py(s.points[0]!)"
          class="single-rule"
        />
        <template v-for="(p, i) in s.points" :key="p.date">
          <rect
            v-if="s.tone === 'b'"
            :x="chart.px(p) - (chart.allSingle ? 6 : i === s.points.length - 1 ? 4.5 : 3)"
            :y="chart.py(p) - (chart.allSingle ? 6 : i === s.points.length - 1 ? 4.5 : 3)"
            :width="chart.allSingle ? 12 : i === s.points.length - 1 ? 9 : 6"
            :height="chart.allSingle ? 12 : i === s.points.length - 1 ? 9 : 6"
            class="dot"
            :class="{ last: i === s.points.length - 1 }"
          />
          <circle
            v-else
            :cx="chart.px(p)"
            :cy="chart.py(p)"
            :r="chart.allSingle ? 6 : i === s.points.length - 1 ? 4.5 : 2.5"
            class="dot"
            :class="{ last: i === s.points.length - 1 }"
          />
        </template>
      </g>

      <text
        v-if="chart.note"
        :x="chart.px(chart.note)"
        :y="chart.py(chart.note) - 18"
        text-anchor="middle"
        class="single-note"
      >
        Verlauf startet am {{ day(chart.note.date) }}
      </text>

      <g v-if="activeDate" class="hover" pointer-events="none">
        <line
          :x1="chart.x(parseDay(activeDate))"
          :x2="chart.x(parseDay(activeDate))"
          :y1="20"
          :y2="chart.innerBottom"
        />
        <template v-for="r in readings" :key="r.id">
          <circle v-if="r.point" :cx="chart.x(parseDay(activeDate))" :cy="chart.py(r.point)" r="7" />
        </template>
      </g>

      <rect
        :x="chart.left"
        :y="0"
        :width="Math.max(0, chart.innerRight - chart.left)"
        :height="HEIGHT"
        fill="transparent"
      />
    </svg>
    <div v-if="activeDate" class="tip" :class="{ flip: tipX > 0.6 }" :style="{ left: `${tipX * 100}%` }">
      <strong>{{ day(activeDate) }}</strong>
      <template v-if="single?.point">
        <span class="num">{{ euro(single.point.priceCents) }}</span>
        <span class="num">{{ euro(single.point.perKgCents) }}/kg</span>
      </template>
      <template v-else>
        <span v-for="r in readings" :key="r.id" class="tip-row" :style="{ '--tone': r.color }">
          <i class="tip-mark" :class="`tone-${r.tone}`" aria-hidden="true" />
          <span class="tip-label">{{ r.label }}</span>
          <span class="num">{{ r.point ? format(r.point[metric]) : '–' }}</span>
        </span>
      </template>
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

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
}

.legend li {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.swatch {
  align-self: center;
  flex: none;
}

.swatch line {
  stroke: var(--tone);
  stroke-width: 2.25;
}

.swatch circle,
.swatch rect {
  fill: var(--tone);
}

.legend-label {
  max-width: 26ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-2);
}

.legend-value {
  font-size: 18px;
  font-weight: 600;
}

.legend-date {
  color: var(--ink-3);
  font-size: 13px;
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
  stroke: var(--tone);
  stroke-width: 2.25;
  stroke-linejoin: round;
}

.dot {
  fill: var(--paper);
  stroke: var(--tone);
  stroke-width: 2;
}

.dot.last {
  fill: var(--tone);
}

.single-rule {
  stroke: var(--tone);
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
  transform: translateX(14px);
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

.tip.flip {
  transform: translateX(calc(-100% - 14px));
}

.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tip-label {
  max-width: 18ch;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.8;
}

.tip-row .num {
  margin-left: auto;
  padding-left: 8px;
}

.tip-mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tone);
  box-shadow: 0 0 0 1.5px var(--paper);
}

.tip-mark.tone-b {
  border-radius: 0;
}
</style>
