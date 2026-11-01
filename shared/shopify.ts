import type { RawProduct } from './catalog.ts'
import type { Shop } from './shops.ts'

const HANDLE_SIZE = /-(\d{3,4})$/

interface ShopifyVariant {
  id?: unknown
  title?: unknown
  price?: unknown
  compare_at_price?: unknown
  grams?: unknown
  available?: unknown
}

export function parseProductsPage(json: unknown, shop: Shop<'shopify'>): RawProduct[] {
  if (typeof json !== 'object' || json === null || !Array.isArray((json as { products?: unknown }).products)) {
    throw new Error('Antwort hat kein products-Array')
  }
  const products = (json as { products: unknown[] }).products
  return products.map((p, i) => {
    const product = p as { title?: unknown; handle?: unknown; product_type?: unknown; variants?: unknown }
    if (typeof product.title !== 'string' || typeof product.handle !== 'string' || !Array.isArray(product.variants)) {
      throw new Error(`Produkt ${i} hat kein title/handle/variants`)
    }
    const handle = product.handle
    const handleSize = HANDLE_SIZE.exec(handle)
    return {
      title: product.title,
      type: typeof product.product_type === 'string' ? product.product_type : '',
      variants: (product.variants as ShopifyVariant[]).map((v) => ({
        title: String(v.title ?? ''),
        url: `https://${shop.domain}/products/${handle}?variant=${Number(v.id)}`,
        price: String(v.price ?? ''),
        compareAtPrice: v.compare_at_price == null ? null : String(v.compare_at_price),
        grams: shop.gramsField === 'gross' ? (handleSize ? Number(handleSize[1]) : null) : Number(v.grams ?? 0),
        available: v.available === true,
      })),
    }
  })
}
