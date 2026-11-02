import { describe, expect, it } from 'vitest'
import { brandName, shopBrand } from '../shared/brands.ts'
import { toOffers, type RawProduct } from '../shared/catalog.ts'
import { buildOverview } from '../shared/prices.ts'
import type { Offer, Snapshot } from '../shared/types.ts'

describe('brandName', () => {
  it.each([
    ['BODYLAB', 'Bodylab'],
    ['IronMaxx® Nutrition', 'IronMaxx'],
    ['IronMaxx Nutrition', 'IronMaxx'],
    ['Weider Germany ', 'Weider'],
    ['PEAK Performance Products S.A.', 'Peak'],
    ['more', 'MORE Nutrition'],
    ['Quality First GmbH', 'MORE Nutrition'],
    ['esn.com', 'ESN'],
    ['InnoNature', 'innonature'],
    ['Rühls Bestes', 'Rühls Bestes'],
    ['VOM ACHTERHOF', 'Vom Achterhof'],
    ['GENIUS NUTRITION', 'Genius Nutrition'],
  ])('maps %j to %j', (raw, expected) => {
    expect(brandName(raw, 'Fallback')).toBe(expected)
  })

  it('falls back when the shop names no maker', () => {
    expect(brandName(null, 'Fallback')).toBe('Fallback')
    expect(brandName('  ', 'Fallback')).toBe('Fallback')
  })

  it("uses the shop's own label as the fallback", () => {
    expect(shopBrand('bodylab')).toBe('Bodylab')
    expect(shopBrand('ruehl')).toBe('Rühls Bestes')
    expect(shopBrand('gymqueen')).toBe('GymQueen')
  })
})

describe('toOffers brand', () => {
  const product = (brand: string | null): RawProduct => ({
    title: 'Whey Protein Isolat',
    type: '',
    brand,
    image: null,
    variants: [{ title: '900 g', url: 'https://shop.example/p', price: '27.99', compareAtPrice: null, grams: 900, available: true, image: null }],
  })

  it('keeps the maker a reseller names', () => {
    expect(toOffers('gymqueen', [product('BODYLAB')])[0]?.brand).toBe('Bodylab')
  })

  it("gives products without a maker the shop's own label", () => {
    expect(toOffers('gymqueen', [product(null)])[0]?.brand).toBe('GymQueen')
  })
})

describe('snapshots without a brand', () => {
  it("read as the shop's own label", () => {
    const old = {
      id: 'ruehl:casein:1000',
      shopId: 'ruehl',
      product: 'Casein',
      url: 'https://shop.example/casein',
      category: 'casein',
      sizeG: 1000,
      priceCents: 2695,
      compareAtCents: null,
      flavors: 1,
    } as unknown as Offer
    const snapshot: Snapshot = { date: '2026-11-01', fetchedAt: '', shops: [{ shopId: 'ruehl', ok: true, offers: 1 }], offers: [old] }
    expect(buildOverview([snapshot]).rows[0]?.brand).toBe('Rühls Bestes')
  })
})
