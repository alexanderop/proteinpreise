import type { Offer, ShopRun, Snapshot } from './types.ts'

export interface PricePoint {
  date: string
  priceCents: number
  perKgCents: number
}

export interface PriceChange {
  previousDate: string
  fromCents: number
  toCents: number
  deltaCents: number
  pct: number
  direction: 'up' | 'down'
}

export interface OfferRow extends Offer {
  perKgCents: number
  reduced: boolean
  isNew: boolean
  change: PriceChange | null
  history: PricePoint[]
}

export type ChangedRow = OfferRow & { change: PriceChange }

export interface Overview {
  date: string | null
  previousDate: string | null
  firstDate: string | null
  shops: ShopRun[]
  rows: OfferRow[]
  changes: ChangedRow[]
  gone: Offer[]
}

const DIRECTION_ORDER: Record<PriceChange['direction'], number> = { down: 0, up: 1 }

export function perKgCents(offer: Pick<Offer, 'priceCents' | 'sizeG'>): number {
  return Math.round((offer.priceCents * 1000) / offer.sizeG)
}

export function isReduced(offer: Pick<Offer, 'priceCents' | 'compareAtCents'>): boolean {
  return offer.compareAtCents !== null && offer.compareAtCents > offer.priceCents
}

function chronological(snapshots: readonly Snapshot[]): Snapshot[] {
  return [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
}

function point(date: string, offer: Offer): PricePoint {
  return { date, priceCents: offer.priceCents, perKgCents: perKgCents(offer) }
}

export function priceSeries(snapshots: readonly Snapshot[], id: string): PricePoint[] {
  return chronological(snapshots).flatMap((s) => {
    const offer = s.offers.find((o) => o.id === id)
    return offer ? [point(s.date, offer)] : []
  })
}

function seriesIndex(snapshots: readonly Snapshot[]): Map<string, PricePoint[]> {
  const index = new Map<string, PricePoint[]>()
  for (const s of snapshots) {
    for (const offer of s.offers) {
      const series = index.get(offer.id)
      if (series) series.push(point(s.date, offer))
      else index.set(offer.id, [point(s.date, offer)])
    }
  }
  return index
}

export function changeBetween(previous: PricePoint, latest: PricePoint): PriceChange | null {
  const deltaCents = latest.priceCents - previous.priceCents
  if (deltaCents === 0) return null
  return {
    previousDate: previous.date,
    fromCents: previous.priceCents,
    toCents: latest.priceCents,
    deltaCents,
    pct: deltaCents / previous.priceCents,
    direction: deltaCents > 0 ? 'up' : 'down',
  }
}

export function buildOverview(snapshots: readonly Snapshot[], historyDays = 90): Overview {
  const ordered = chronological(snapshots)
  const latest = ordered.at(-1)
  const previous = ordered.at(-2)
  if (!latest) {
    return { date: null, previousDate: null, firstDate: null, shops: [], rows: [], changes: [], gone: [] }
  }

  const index = seriesIndex(ordered)
  const previousIds = new Set(previous?.offers.map((o) => o.id))

  const rows = latest.offers.map((offer): OfferRow => {
    const series = index.get(offer.id) ?? []
    const last = series.at(-1)
    const before = series.at(-2)
    return {
      ...offer,
      perKgCents: perKgCents(offer),
      reduced: isReduced(offer),
      isNew: previous !== undefined && !previousIds.has(offer.id),
      change: last && before ? changeBetween(before, last) : null,
      history: series.slice(-historyDays),
    }
  })

  const okShops = new Set(latest.shops.filter((s) => s.ok).map((s) => s.shopId))
  const latestIds = new Set(latest.offers.map((o) => o.id))
  const gone = (previous?.offers ?? []).filter((o) => okShops.has(o.shopId) && !latestIds.has(o.id))

  const changes = rows
    .filter((r): r is ChangedRow => r.change !== null)
    .sort((a, b) => DIRECTION_ORDER[a.change.direction] - DIRECTION_ORDER[b.change.direction] || Math.abs(b.change.pct) - Math.abs(a.change.pct))

  return {
    date: latest.date,
    previousDate: previous?.date ?? null,
    firstDate: ordered[0]!.date,
    shops: latest.shops,
    rows,
    changes,
    gone,
  }
}

export function toRouteId(id: string): string {
  return id.replaceAll(':', '_')
}

export function fromRouteId(routeId: string): string {
  return routeId.replaceAll('_', ':')
}
