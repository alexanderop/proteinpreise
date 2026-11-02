import { describe, expect, it } from 'vitest'
import { cheapestRival, compareOffers, resolveSlot, toggleSelection } from '../shared/compare.ts'
import { buildCatalog } from '../shared/prices.ts'
import type { Offer, Snapshot } from '../shared/types.ts'

function offer(id: string, priceCents: number, overrides: Partial<Offer> = {}): Offer {
  const [shopId, slug, size] = id.split(':')
  return {
    id,
    shopId: shopId!,
    product: slug!,
    url: `https://shop.example/${slug}`,
    category: 'whey',
    sizeG: Number(size),
    priceCents,
    compareAtCents: null,
    flavors: 1,
    image: null,
    brand: 'Testmarke',
    ...overrides,
  }
}

function snapshot(date: string, offers: Offer[]): Snapshot {
  return { date, fetchedAt: `${date}T06:00:00.000Z`, shops: [], offers }
}

const history = buildCatalog([
  snapshot('2026-11-03', [offer('esn:designer:1000', 2700), offer('more:total:600', 2400)]),
  snapshot('2026-11-01', [offer('esn:designer:1000', 3000), offer('more:total:600', 2400), offer('peak:old:1000', 2000)]),
  snapshot('2026-11-02', [offer('esn:designer:1000', 3300), offer('peak:old:1000', 2500)]),
])

describe('compareOffers', () => {
  it('names the side that is cheaper per kilo, with the gap in cents and as a share of the dearer price', () => {
    const c = compareOffers(history, 'esn:designer:1000', 'more:total:600')!
    expect(c.a.current.perKgCents).toBe(2700)
    expect(c.b.current.perKgCents).toBe(4000)
    expect(c).toMatchObject({ cheaperPerKg: 'a', diffPerKgCents: 1300, pct: 1300 / 4000 })
  })

  it('compares per kilo, not per pack, when the sizes differ', () => {
    const catalog = buildCatalog([snapshot('2026-11-01', [offer('a:big:2500', 5000), offer('b:small:500', 1500)])])
    const c = compareOffers(catalog, 'a:big:2500', 'b:small:500')!
    expect(c.a.offer.priceCents).toBeGreaterThan(c.b.offer.priceCents)
    expect(c).toMatchObject({ cheaperPerKg: 'a', diffPerKgCents: 1000, pct: 1000 / 3000 })
  })

  it('calls equal per-kilo prices a tie', () => {
    const catalog = buildCatalog([snapshot('2026-11-01', [offer('a:x:1000', 2000), offer('b:y:500', 1000)])])
    expect(compareOffers(catalog, 'a:x:1000', 'b:y:500')).toMatchObject({ cheaperPerKg: 'equal', diffPerKgCents: 0, pct: 0 })
  })

  it('keeps each side’s history oldest first with its lowest and highest per-kilo price', () => {
    const { a } = compareOffers(history, 'esn:designer:1000', 'more:total:600')!
    expect(a.series.map((p) => p.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03'])
    expect(a.low).toEqual({ date: '2026-11-03', priceCents: 2700, perKgCents: 2700 })
    expect(a.high).toEqual({ date: '2026-11-02', priceCents: 3300, perKgCents: 3300 })
  })

  it('compares an offer that left the catalog by its last seen price and marks it unlisted', () => {
    const c = compareOffers(history, 'peak:old:1000', 'esn:designer:1000')!
    expect(c.a).toMatchObject({ listed: false, current: { date: '2026-11-02', perKgCents: 2500 } })
    expect(c.b.listed).toBe(true)
    expect(c.cheaperPerKg).toBe('a')
  })

  it('returns null when either id was never seen', () => {
    expect(compareOffers(history, 'esn:designer:1000', 'nope:x:1')).toBeNull()
  })
})

describe('toggleSelection', () => {
  it('adds, removes, and replaces the oldest pick past the limit', () => {
    expect(toggleSelection([], 'x')).toEqual(['x'])
    expect(toggleSelection(['x'], 'y')).toEqual(['x', 'y'])
    expect(toggleSelection(['x', 'y'], 'z')).toEqual(['y', 'z'])
    expect(toggleSelection(['x', 'y'], 'x')).toEqual(['y'])
  })
})

describe('resolveSlot', () => {
  it('tells an empty slot from an unknown id and a known offer', () => {
    expect(resolveSlot(history, null)).toEqual({ kind: 'empty' })
    expect(resolveSlot(history, 'nope-x-1')).toEqual({ kind: 'unknown', routeId: 'nope-x-1' })
    expect(resolveSlot(history, 'peak-old-1000')).toMatchObject({ kind: 'offer', entry: { listed: false } })
  })
})

describe('cheapestRival', () => {
  it('picks the cheapest listed offer per kilo in the same category, never the offer itself or a gone one', () => {
    const catalog = buildCatalog([
      snapshot('2026-11-01', [offer('x:gone:1000', 1000)]),
      snapshot('2026-11-02', [
        offer('a:self:1000', 2000),
        offer('b:dear:1000', 3000),
        offer('c:cheap:2000', 5000),
        offer('d:vegan:1000', 1500, { category: 'vegan' }),
      ]),
    ])
    expect(cheapestRival(catalog, 'a:self:1000')?.offer.id).toBe('c:cheap:2000')
    expect(cheapestRival(catalog, 'd:vegan:1000')).toBeNull()
  })
})
