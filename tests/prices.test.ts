import { describe, expect, it } from 'vitest'
import { buildOverview, fromRouteId, priceSeries, toRouteId } from '../shared/prices.ts'
import type { Offer, Snapshot } from '../shared/types.ts'

function offer(id: string, priceCents: number, overrides: Partial<Offer> = {}): Offer {
  return {
    id,
    shopId: id.split(':')[0]!,
    product: id,
    url: `https://shop.example/${id}`,
    category: 'whey',
    sizeG: Number(id.split(':')[2]),
    priceCents,
    compareAtCents: null,
    flavors: 1,
    ...overrides,
  }
}

function snapshot(date: string, offers: Offer[], failed: string[] = []): Snapshot {
  const shopIds = new Set([...offers.map((o) => o.shopId), ...failed])
  return {
    date,
    fetchedAt: `${date}T06:00:00.000Z`,
    shops: [...shopIds].map((shopId) => ({
      shopId,
      ok: !failed.includes(shopId),
      offers: offers.filter((o) => o.shopId === shopId).length,
    })),
    offers,
  }
}

const history = [
  snapshot('2026-11-01', [offer('a:whey:1000', 3000), offer('a:iso:900', 5000), offer('b:vegan:500', 2000)]),
  snapshot('2026-11-02', [offer('a:whey:1000', 2700), offer('a:iso:900', 5000)]),
  snapshot('2026-11-03', [
    offer('a:whey:1000', 2700),
    offer('a:iso:900', 5500, { compareAtCents: 6000 }),
    offer('b:vegan:500', 1800),
    offer('a:casein:750', 3600),
  ]),
]

describe('priceSeries', () => {
  it('lists one point per snapshot that had the offer, oldest first', () => {
    expect(priceSeries(history.toReversed(), 'b:vegan:500')).toEqual([
      { date: '2026-11-01', priceCents: 2000, perKgCents: 4000 },
      { date: '2026-11-03', priceCents: 1800, perKgCents: 3600 },
    ])
  })
})

describe('buildOverview', () => {
  const overview = buildOverview(history)
  const row = (id: string) => overview.rows.find((r) => r.id === id)!

  it('compares against the previous snapshot that had the offer', () => {
    expect(row('b:vegan:500').change).toEqual({
      previousDate: '2026-11-01',
      fromCents: 2000,
      toCents: 1800,
      deltaCents: -200,
      pct: -0.1,
      direction: 'down',
    })
    expect(row('a:iso:900').change).toMatchObject({ direction: 'up', deltaCents: 500, previousDate: '2026-11-02' })
  })

  it('reports no change when the price held', () => {
    expect(row('a:whey:1000').change).toBeNull()
  })

  it('lists price drops before rises', () => {
    expect(overview.changes.map((r) => r.id)).toEqual(['b:vegan:500', 'a:iso:900'])
  })

  it('marks reduced offers, new offers and per-kilo prices', () => {
    expect(row('a:iso:900')).toMatchObject({ reduced: true, perKgCents: 6111 })
    expect(row('a:casein:750')).toMatchObject({ isNew: true, perKgCents: 4800 })
    expect(row('b:vegan:500').isNew).toBe(true)
    expect(row('a:whey:1000').isNew).toBe(false)
  })

  it('counts gone offers only for shops that answered', () => {
    const next = buildOverview([
      ...history,
      snapshot('2026-11-04', [offer('a:whey:1000', 2700)], ['b']),
    ])
    expect(next.gone.map((o) => o.id).toSorted()).toEqual(['a:casein:750', 'a:iso:900'])
  })

  it('handles a single snapshot without changes or new flags', () => {
    const first = buildOverview(history.slice(0, 1))
    expect(first).toMatchObject({ date: '2026-11-01', previousDate: null, firstDate: '2026-11-01', changes: [], gone: [] })
    expect(first.rows.every((r) => !r.isNew && r.history.length === 1)).toBe(true)
  })

  it('returns an empty overview without snapshots', () => {
    expect(buildOverview([])).toMatchObject({ date: null, rows: [] })
  })
})

describe('route ids', () => {
  it('round-trips offer ids through a url-safe form', () => {
    const id = 'esn:designer-whey-protein:908'
    expect(toRouteId(id)).toBe('esn_designer-whey-protein_908')
    expect(fromRouteId(toRouteId(id))).toBe(id)
  })
})
