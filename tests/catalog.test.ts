import { describe, expect, it } from 'vitest'
import { classify, parseSizeFromText, toOffers, variantSize, type RawProduct, type RawVariant } from '../shared/catalog.ts'

function variant(overrides: Partial<RawVariant>): RawVariant {
  return { title: 'Default Title', url: 'https://shop.example/p', price: '29.90', compareAtPrice: null, grams: null, available: true, ...overrides }
}

function product(title: string, variants: RawVariant[], type = ''): RawProduct {
  return { title, type, variants }
}

describe('parseSizeFromText', () => {
  it.each([
    ['Vanilla / 480g', 480],
    ['Neutral / 1000 g', 1000],
    ['Schoko / 2kg', 2000],
    ['Beutel 2,5 kg', 2500],
    ['1x 450g (30 Portionen)', 450],
    ['Isolate Whey (2.27kg)', 2270],
    ['Default Title', null],
    ['3K-Protein', null],
  ])('reads %s as %s', (text, expected) => {
    expect(parseSizeFromText(text)).toBe(expected)
  })
})

describe('variantSize', () => {
  it('prefers the variant title, then the product title', () => {
    expect(variantSize(variant({ title: 'Pistazie / 420g', grams: 2300 }), 'Isolate Whey 100')).toBe(420)
    expect(variantSize(variant({ title: 'Vanille' }), 'Iso Whey (900g)')).toBe(900)
  })

  it('falls back to grams only inside 100 to 5000', () => {
    expect(variantSize(variant({ grams: 900 }), 'Daily Protein')).toBe(900)
    expect(variantSize(variant({ grams: 935000 }), 'Delicious Whey')).toBeNull()
    expect(variantSize(variant({ grams: 0 }), 'Whey')).toBeNull()
    expect(variantSize(variant({ grams: null }), 'Whey')).toBeNull()
  })
})

describe('classify', () => {
  it.each([
    ['Iso Whey Protein Isolat', 'isolate'],
    ['Designer Whey Protein', 'whey'],
    ['Vegan Protein Isolat', 'vegan'],
    ['Soja Protein Isolat', 'vegan'],
    ['Micellar Casein', 'casein'],
    ['3K-Protein (1000g)', 'mehrkomponenten'],
    ['Daily Protein', 'mehrkomponenten'],
    ['Clear Whey Isolate (960g)', 'isolate'],
    ['2K-Whey&Casein-Protein (1kg)', 'mehrkomponenten'],
    ['2K-Ei+Whey-Protein Isolat 92 (1kg)', 'mehrkomponenten'],
    ['Ei-Soja-Protein Isolat 91 (1kg)', 'mehrkomponenten'],
    ['Whey & Ei-Protein Konzentrat 82 (1kg)', 'mehrkomponenten'],
    ['Protein-Wasser (800g)', 'isolate'],
  ])('puts %s into %s', (title, category) => {
    expect(classify({ title, type: '' })).toBe(category)
  })

  it.each([
    ['Designer Bar Proteinriegel', ''],
    ['Protein Cold Brew', ''],
    ['High Protein für Faule', 'book'],
    ['Vegan Protein Deal: 2 + 1 GRATIS', 'bundle'],
    ['Protein Layer (18x50g)', 'simple'],
    ['BODYLAB Whey Protein Adventskalender (24x30g)', 'simple'],
    ['ZENITH® 50 Protein Riegel (12x100g) - Erdnuss', ''],
    ['More Protein Peanut Flips', 'Food'],
    ['Vegan Omega-3', ''],
  ])('excludes %s', (title, type) => {
    expect(classify({ title, type })).toBeNull()
  })

  it('ignores flavor words after the dash', () => {
    expect(classify({ title: '100% Whey Protein (2350g) - Chocolate and Cookies', type: '' })).toBe('whey')
  })
})

describe('toOffers', () => {
  it('keeps the cheapest available variant per size and counts its flavors', () => {
    const offers = toOffers('test', [
      product('Designer Whey Protein', [
        variant({ url: 'https://shop.example/v1', title: 'Vanilla / 908g', price: '47.90' }),
        variant({ url: 'https://shop.example/v2', title: 'Chocolate / 908g', price: '44.90', compareAtPrice: '47.90' }),
        variant({ url: 'https://shop.example/v3', title: 'Banana / 908g', price: '39.90', available: false }),
        variant({ url: 'https://shop.example/v4', title: 'Vanilla / 2000g Beutel', price: '102.90' }),
        variant({ url: 'https://shop.example/v5', title: 'Vanilla / 30g Probe', price: '3.29' }),
      ]),
    ])
    expect(offers).toEqual([
      {
        id: 'test:designer-whey-protein:2000',
        shopId: 'test',
        product: 'Designer Whey Protein',
        url: 'https://shop.example/v4',
        category: 'whey',
        sizeG: 2000,
        priceCents: 10290,
        compareAtCents: null,
        flavors: 1,
      },
      {
        id: 'test:designer-whey-protein:908',
        shopId: 'test',
        product: 'Designer Whey Protein',
        url: 'https://shop.example/v2',
        category: 'whey',
        sizeG: 908,
        priceCents: 4490,
        compareAtCents: 4790,
        flavors: 2,
      },
    ])
  })

  it('merges one-product-per-flavor shops into one offer per size', () => {
    const offers = toOffers('test', [
      product('100% Whey Protein (500g) - Erdbeere', [variant({ price: '24.99', grams: 499 })]),
      product('100% Whey Protein (500g) - Vanille', [variant({ price: '20.14', grams: 499 })]),
    ])
    expect(offers.map((o) => [o.id, o.product, o.priceCents, o.flavors])).toEqual([
      ['test:100-whey-protein:500', '100% Whey Protein', 2014, 2],
    ])
  })

  it('drops zero prices and implausible per-kilo prices', () => {
    const offers = toOffers('test', [
      product('Whey Isolat', [variant({ title: '1000g', price: '0.00' })]),
      product('Protein Shake', [variant({ title: 'Coconut', price: '2.39', grams: 400 })]),
    ])
    expect(offers).toEqual([])
  })
})
