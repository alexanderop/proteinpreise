import { describe, expect, it } from 'vitest'
import { toOffers } from '../shared/catalog.ts'
import { parseProductsPage } from '../shared/shopify.ts'
import type { Shop } from '../shared/shops.ts'

const net: Shop<'shopify'> = { id: 'test', name: 'Test', domain: 'shop.example', source: 'shopify' }
const gross: Shop<'shopify'> = { ...net, gramsField: 'gross' }

function page(handle: string, title: string, variant: Record<string, unknown>, product: Record<string, unknown> = {}) {
  return { products: [{ title, handle, product_type: 'Protein', variants: [{ id: 7, title: 'Vanille', price: '29.90', available: true, ...variant }], ...product }] }
}

describe('parseProductsPage', () => {
  it('reads the maker from vendor, unless the vendor is just the shop domain', () => {
    expect(parseProductsPage(page('iso', 'Iso', { grams: 900 }, { vendor: 'BODYLAB' }), net)[0]?.brand).toBe('BODYLAB')
    expect(parseProductsPage(page('iso', 'Iso', { grams: 900 }, { vendor: 'shop.example' }), net)[0]?.brand).toBeNull()
  })

  it('links each variant and keeps the compare-at price', () => {
    const [product] = parseProductsPage(page('iso-whey', 'Iso Whey', { compare_at_price: '34.90', grams: 900 }), net)
    expect(product).toEqual({
      title: 'Iso Whey',
      type: 'Protein',
      brand: null,
      image: null,
      variants: [
        { title: 'Vanille', url: 'https://shop.example/products/iso-whey?variant=7', price: '29.90', compareAtPrice: '34.90', grams: 900, available: true, image: null },
      ],
    })
  })

  it('pictures each offer with its variant image, else the first product image', () => {
    const images = { images: [{ src: '//cdn.shopify.com/s/files/1/front.jpg?v=1' }, { src: 'https://cdn.shopify.com/s/files/1/back.jpg' }] }
    const own = parseProductsPage(page('iso-whey', 'Iso Whey', { grams: 900, featured_image: { src: 'https://cdn.shopify.com/s/files/1/vanille.jpg?v=2' } }, images), net)
    const shared = parseProductsPage(page('iso-whey', 'Iso Whey', { grams: 900, featured_image: null }, images), net)
    expect(toOffers('test', own)[0]?.image).toBe('https://cdn.shopify.com/s/files/1/vanille.jpg?v=2')
    expect(shared[0]?.image).toBe('https://cdn.shopify.com/s/files/1/front.jpg?v=1')
    expect(toOffers('test', shared)[0]?.image).toBe('https://cdn.shopify.com/s/files/1/front.jpg?v=1')
  })

  it('leaves the image empty when the product has none', () => {
    const products = parseProductsPage(page('iso-whey', 'Iso Whey', { grams: 900 }, { images: [] }), net)
    expect(toOffers('test', products)[0]?.image).toBeNull()
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
