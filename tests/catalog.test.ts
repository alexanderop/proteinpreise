import { describe, expect, it } from 'vitest'
import { classify, parseSizeFromText, toOffers, variantSize, type RawProduct, type RawVariant } from '../shared/catalog.ts'
import type { Shop } from '../shared/shops.ts'

const shop: Shop = { id: 'test', name: 'Test', domain: 'shop.example' }

function variant(overrides: Partial<RawVariant>): RawVariant {
  return { id: 1, title: 'Default Title', price: '29.90', compare_at_price: null, grams: 0, available: true, ...overrides }
}

function product(title: string, variants: RawVariant[], product_type = ''): RawProduct {
  return { title, handle: title.toLowerCase().replace(/\W+/g, '-'), product_type, variants }
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
  const named = (title: string, handle = 'whey') => ({ title, handle })

  it('prefers the variant title, then the product title', () => {
    expect(variantSize(variant({ title: 'Pistazie / 420g', grams: 2300 }), named('Isolate Whey 100'))).toBe(420)
    expect(variantSize(variant({ title: 'Vanille' }), named('Iso Whey (900g)'))).toBe(900)
  })

  it('falls back to grams only inside 100 to 5000', () => {
    expect(variantSize(variant({ grams: 900 }), named('Daily Protein'))).toBe(900)
    expect(variantSize(variant({ grams: 935000 }), named('Delicious Whey'))).toBeNull()
    expect(variantSize(variant({ grams: 0 }), named('Whey'))).toBeNull()
  })

  it('reads the size from the handle when a shop reports gross weight', () => {
    expect(variantSize(variant({ grams: 1300 }), named('Micellar Casein', 'micellar-casein-900'), 'gross')).toBe(900)
    expect(variantSize(variant({ grams: 935 }), named('Hybrid Protein', 'hybrid-protein'), 'gross')).toBeNull()
    expect(variantSize(variant({ grams: 935 }), named('Protein 85', 'protein-85'), 'gross')).toBeNull()
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
  ])('puts %s into %s', (title, category) => {
    expect(classify({ title, product_type: '' })).toBe(category)
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
  ])('excludes %s', (title, product_type) => {
    expect(classify({ title, product_type })).toBeNull()
  })

  it('ignores flavor words after the dash', () => {
    expect(classify({ title: '100% Whey Protein (2350g) - Chocolate and Cookies', product_type: '' })).toBe('whey')
  })
})

describe('toOffers', () => {
  it('keeps the cheapest available variant per size and counts its flavors', () => {
    const offers = toOffers(shop, [
      product('Designer Whey Protein', [
        variant({ id: 1, title: 'Vanilla / 908g', price: '47.90' }),
        variant({ id: 2, title: 'Chocolate / 908g', price: '44.90', compare_at_price: '47.90' }),
        variant({ id: 3, title: 'Banana / 908g', price: '39.90', available: false }),
        variant({ id: 4, title: 'Vanilla / 2000g Beutel', price: '102.90' }),
        variant({ id: 5, title: 'Vanilla / 30g Probe', price: '3.29' }),
      ]),
    ])
    expect(offers).toEqual([
      {
        id: 'test:designer-whey-protein:2000',
        shopId: 'test',
        product: 'Designer Whey Protein',
        url: 'https://shop.example/products/designer-whey-protein?variant=4',
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
        url: 'https://shop.example/products/designer-whey-protein?variant=2',
        category: 'whey',
        sizeG: 908,
        priceCents: 4490,
        compareAtCents: 4790,
        flavors: 2,
      },
    ])
  })

  it('merges one-product-per-flavor shops into one offer per size', () => {
    const offers = toOffers(shop, [
      product('100% Whey Protein (500g) - Erdbeere', [variant({ price: '24.99', grams: 499 })]),
      product('100% Whey Protein (500g) - Vanille', [variant({ price: '20.14', grams: 499 })]),
    ])
    expect(offers.map((o) => [o.id, o.product, o.priceCents, o.flavors])).toEqual([
      ['test:100-whey-protein:500', '100% Whey Protein', 2014, 2],
    ])
  })

  it('drops zero prices and implausible per-kilo prices', () => {
    const offers = toOffers(shop, [
      product('Whey Isolat', [variant({ title: '1000g', price: '0.00' })]),
      product('Protein Shake', [variant({ title: 'Coconut', price: '2.39', grams: 400 })]),
    ])
    expect(offers).toEqual([])
  })
})
