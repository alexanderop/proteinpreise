import type { RawProduct, RawVariant } from './catalog.ts'

export interface Listing {
  products: string[]
  next: string | null
}

const PRODUCT_LINK = /<a\s[^>]*class="product-url\s*"[^>]*>/g
const NEXT_LINK = /<a\s[^>]*title="nächste Seite"[^>]*>/
const HREF = /\shref="([^"]+)"/
const JSON_LD = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g

function href(tag: string, base: string): string | null {
  const match = HREF.exec(tag)
  return match ? new URL(match[1]!.replaceAll('&amp;', '&'), base).href : null
}

export function parseListing(html: string, pageUrl: string): Listing {
  const origin = new URL(pageUrl).origin
  const products = new Set<string>()
  for (const [tag] of html.matchAll(PRODUCT_LINK)) {
    const url = href(tag, pageUrl)
    if (url && new URL(url).origin === origin) products.add(url)
  }
  const nextTag = NEXT_LINK.exec(html)
  return { products: [...products], next: nextTag ? href(nextTag[0], pageUrl) : null }
}

type Json = Record<string, unknown>

const record = (value: unknown): Json | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Json) : undefined

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

function referenceGrams(offer: Json | undefined): number | null {
  const quantity = record(record(offer?.priceSpecification)?.referenceQuantity)
  const value = Number(quantity?.value)
  if (!Number.isFinite(value) || value <= 0) return null
  if (quantity?.unitText === 'kg') return Math.round(value * 1000)
  if (quantity?.unitText === 'g') return Math.round(value)
  return null
}

function variant(title: string, offer: Json | undefined, fallback: Json, pageUrl: string): RawVariant {
  return {
    title,
    url: text(offer?.url) ?? pageUrl,
    price: text(offer?.price) ?? text(fallback.price) ?? '',
    // The struck-through price on these pages is the maker's own UVP, not an earlier selling price.
    compareAtPrice: null,
    grams: referenceGrams(offer) ?? referenceGrams(fallback),
    available: (text(offer?.availability) ?? text(fallback.availability) ?? '').endsWith('InStock'),
  }
}

function productBlock(html: string): Json | undefined {
  for (const [, body] of html.matchAll(JSON_LD)) {
    const block = record(JSON.parse(body!))
    if (block?.['@type'] === 'Product') return block
  }
  return undefined
}

export function parseProductPage(html: string, pageUrl: string): RawProduct | null {
  const product = productBlock(html)
  const title = text(product?.name)
  const offer = record(product?.offers)
  if (!product || !title || !offer) return null

  const models = Array.isArray(product.model) ? product.model.map(record).filter((m) => m !== undefined) : []
  const variants =
    models.length > 0
      ? models.map((m) => variant(text(m.model) ?? text(m.name) ?? '', record(m.offers), offer, text(m.url) ?? pageUrl))
      : [variant(text(product.model) ?? '', offer, offer, pageUrl)]

  return { title, type: '', variants }
}
