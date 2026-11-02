import * as v from 'valibot'
import { imageUrl, type RawProduct } from './catalog.ts'
import type { Shop } from './shops.ts'
import { Numeric, NumericText, parseWith } from './validate.ts'

const Variant = v.object({
  id: v.number(),
  title: v.optional(v.string(), ''),
  price: NumericText,
  compare_at_price: v.nullish(NumericText, null),
  grams: v.nullish(v.number(), 0),
  available: v.optional(v.boolean(), false),
  featured_image: v.nullish(v.object({ src: v.string() }), null),
})

const ProductsPage = v.object({
  products: v.array(
    v.object({
      title: v.string(),
      handle: v.string(),
      product_type: v.optional(v.string(), ''),
      vendor: v.nullish(v.string(), null),
      images: v.optional(v.array(v.object({ src: v.string() })), []),
      variants: v.array(Variant),
    }),
  ),
})

// `/products/<handle>.js` carries the legal unit price (Grundpreis): the net content
// each variant's per-kilo price is computed from.
const ProductJs = v.object({
  variants: v.array(
    v.object({
      id: v.number(),
      unit_price_measurement: v.nullish(v.object({ quantity_value: Numeric, quantity_unit: v.string() }), null),
    }),
  ),
})

export interface ShopifyProduct extends RawProduct {
  handle: string
}

const variantUrl = (domain: string, handle: string, id: number) => `https://${domain}/products/${handle}?variant=${id}`

export function parseProductsPage(json: unknown, shop: Shop<'shopify'>): ShopifyProduct[] {
  const base = `https://${shop.domain}/`
  return parseWith(ProductsPage, json, 'products.json').products.map((product) => ({
    handle: product.handle,
    title: product.title,
    type: product.product_type,
    brand: product.vendor !== null && product.vendor.trim() !== shop.domain ? product.vendor : null,
    image: imageUrl(product.images[0]?.src, base),
    variants: product.variants.map((variant) => ({
      title: variant.title,
      url: variantUrl(shop.domain, product.handle, variant.id),
      price: variant.price,
      compareAtPrice: variant.compare_at_price,
      // A shop that reports gross weight gets its net weight later, from the unit price (see withNetGrams).
      grams: shop.gramsField === 'gross' ? null : variant.grams,
      available: variant.available,
      image: imageUrl(variant.featured_image?.src, base),
    })),
  }))
}

export function productJsUrl(shop: Shop<'shopify'>, product: ShopifyProduct): string {
  return `https://${shop.domain}/products/${product.handle}.js`
}

const UNIT_GRAMS: Record<string, number> = { g: 1, kg: 1000 }

export function withNetGrams(shop: Shop<'shopify'>, product: ShopifyProduct, json: unknown): ShopifyProduct {
  const net = new Map<string, number>()
  for (const { id, unit_price_measurement: measurement } of parseWith(ProductJs, json, `${product.handle}.js`).variants) {
    const factor = measurement ? UNIT_GRAMS[measurement.quantity_unit] : undefined
    if (measurement && factor !== undefined && Number.isFinite(measurement.quantity_value) && measurement.quantity_value > 0) {
      net.set(variantUrl(shop.domain, product.handle, id), Math.round(measurement.quantity_value * factor))
    }
  }
  return { ...product, variants: product.variants.map((variant) => ({ ...variant, grams: net.get(variant.url) ?? null })) }
}
