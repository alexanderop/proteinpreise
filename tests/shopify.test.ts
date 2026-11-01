import { describe, expect, it } from 'vitest'
import { toOffers } from '../shared/catalog.ts'
import { parseProductsPage } from '../shared/shopify.ts'
import type { Shop } from '../shared/shops.ts'

const net: Shop<'shopify'> = { id: 'test', name: 'Test', domain: 'shop.example', source: 'shopify' }
const gross: Shop<'shopify'> = { ...net, gramsField: 'gross' }

function page(handle: string, title: string, variant: Record<string, unknown>) {
  return { products: [{ title, handle, product_type: 'Protein', variants: [{ id: 7, title: 'Vanille', price: '29.90', available: true, ...variant }] }] }
}

describe('parseProductsPage', () => {
  it('links each variant and keeps the compare-at price', () => {
    const [product] = parseProductsPage(page('iso-whey', 'Iso Whey', { compare_at_price: '34.90', grams: 900 }), net)
    expect(product).toEqual({
      title: 'Iso Whey',
      type: 'Protein',
      variants: [
        { title: 'Vanille', url: 'https://shop.example/products/iso-whey?variant=7', price: '29.90', compareAtPrice: '34.90', grams: 900, available: true },
      ],
    })
  })

  it('reads the size from the handle when the shop reports gross weight', () => {
    const offers = (handle: string, title: string) => toOffers('test', parseProductsPage(page(handle, title, { grams: 1300 }), gross))
    expect(offers('micellar-casein-900', 'Micellar Casein').map((o) => o.sizeG)).toEqual([900])
    expect(offers('hybrid-protein', 'Hybrid Protein')).toEqual([])
    expect(offers('protein-85', 'Protein 85')).toEqual([])
  })

  it('rejects a response without products', () => {
    expect(() => parseProductsPage({ items: [] }, net)).toThrow('products-Array')
  })
})
