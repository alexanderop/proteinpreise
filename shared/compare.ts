import type { Offer } from './types.ts'
import { type Catalog, type CatalogEntry, type PricePoint } from './prices.ts'
import { shopName } from './shops.ts'
import { fromRouteId } from './routes.ts'

export type Side = 'a' | 'b'

export interface ComparisonSide {
  offer: Offer
  shop: string
  listed: boolean
  current: PricePoint
  series: PricePoint[]
  low: PricePoint
  high: PricePoint
}

export interface Comparison {
  a: ComparisonSide
  b: ComparisonSide
  cheaperPerKg: Side | 'equal'
  diffPerKgCents: number
  pct: number
}

function side(entry: CatalogEntry): ComparisonSide {
  const { series } = entry
  return {
    offer: entry.offer,
    shop: shopName(entry.offer.shopId),
    listed: entry.listed,
    current: series.at(-1)!,
    series,
    low: series.reduce((min, p) => (p.perKgCents < min.perKgCents ? p : min)),
    high: series.reduce((max, p) => (p.perKgCents > max.perKgCents ? p : max)),
  }
}

export function findEntry(catalog: Catalog, id: string): CatalogEntry | null {
  return catalog.entries.find((e) => e.offer.id === id && e.series.length > 0) ?? null
}

export function compareOffers(catalog: Catalog, idA: string, idB: string): Comparison | null {
  const entryA = findEntry(catalog, idA)
  const entryB = findEntry(catalog, idB)
  if (!entryA || !entryB) return null
  const a = side(entryA)
  const b = side(entryB)
  const kgA = a.current.perKgCents
  const kgB = b.current.perKgCents
  const higher = Math.max(kgA, kgB)
  return {
    a,
    b,
    cheaperPerKg: kgA === kgB ? 'equal' : kgA < kgB ? 'a' : 'b',
    diffPerKgCents: Math.abs(kgA - kgB),
    pct: Math.abs(kgA - kgB) / higher,
  }
}

export type Standing =
  | { role: 'cheaper'; pct: number }
  | { role: 'dearer'; diffPerKgCents: number }
  | { role: 'equal' }

export function standing(comparison: Comparison, of: Side): Standing {
  const { cheaperPerKg, pct, diffPerKgCents } = comparison
  if (cheaperPerKg === 'equal') return { role: 'equal' }
  return cheaperPerKg === of ? { role: 'cheaper', pct } : { role: 'dearer', diffPerKgCents }
}

export function toggleSelection(selected: readonly string[], id: string, max = 2): string[] {
  if (selected.includes(id)) return selected.filter((s) => s !== id)
  return [...selected, id].slice(-max)
}

export type Slot = { kind: 'empty' } | { kind: 'unknown'; routeId: string } | { kind: 'offer'; entry: CatalogEntry }

export function resolveSlot(catalog: Catalog, routeId: string | null): Slot {
  if (!routeId) return { kind: 'empty' }
  const id = fromRouteId(routeId)
  const entry = id ? findEntry(catalog, id) : null
  return entry ? { kind: 'offer', entry } : { kind: 'unknown', routeId }
}

export function cheapestRival(catalog: Catalog, id: string): CatalogEntry | null {
  const self = findEntry(catalog, id)
  if (!self) return null
  return catalog.entries
    .filter((e) => e.listed && e.offer.category === self.offer.category && e.offer.id !== id)
    .reduce<CatalogEntry | null>((best, e) => (!best || e.series.at(-1)!.perKgCents < best.series.at(-1)!.perKgCents ? e : best), null)
}
