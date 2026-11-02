import * as v from 'valibot'
import { imageUrl, type RawProduct, type RawVariant } from './catalog.ts'
import { Numeric, NumericText, parseWith } from './validate.ts'

export interface Listing {
  products: string[]
  next: string | null
}

const PRODUCT_LINK = /<a\s[^>]*class="product-url\s*"[^>]*>/g
const NEXT_LINK = /<a\s[^>]*title="nächste Seite"[^>]*>/
const HREF = /\shref="([^"]+)"/
const JSON_LD = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
const OG_IMAGE = /<meta\s[^>]*property="og:image"[^>]*>/
const CONTENT = /\scontent="([^"]+)"/

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

const ImageRef = v.union([v.string(), v.object({ url: v.optional(v.string()), contentUrl: v.optional(v.string()) })])
// An image in a shape we do not know is dropped rather than failing the whole product.
// The array comes first: valibot's object() also accepts an array and would strip it to {}.
const Image = v.fallback(v.optional(v.union([v.array(ImageRef), ImageRef])), undefined)

const Offer = v.object({
  url: v.optional(v.string()),
  price: v.optional(NumericText),
  availability: v.optional(v.string()),
  priceSpecification: v.optional(
    v.object({ referenceQuantity: v.optional(v.object({ value: Numeric, unitText: v.optional(v.string()) })) }),
  ),
})
type Offer = v.InferOutput<typeof Offer>

const Model = v.object({
  model: v.optional(v.string()),
  name: v.optional(v.string()),
  url: v.optional(v.string()),
  image: Image,
  offers: v.optional(Offer),
})

const Product = v.object({
  name: v.string(),
  image: Image,
  offers: Offer,
  model: v.optional(v.union([v.array(Model), v.string()])),
  brand: v.optional(v.union([v.string(), v.object({ name: v.optional(v.string()) })])),
})
type Product = v.InferOutput<typeof Product>

function referenceGrams(offer: Offer | undefined): number | null {
  const quantity = offer?.priceSpecification?.referenceQuantity
  if (!quantity || !Number.isFinite(quantity.value) || quantity.value <= 0) return null
  if (quantity.unitText === 'kg') return Math.round(quantity.value * 1000)
  if (quantity.unitText === 'g') return Math.round(quantity.value)
  return null
}

function jsonLdImage(image: v.InferOutput<typeof Image>, pageUrl: string): string | null {
  for (const ref of Array.isArray(image) ? image : [image]) {
    const url = imageUrl(typeof ref === 'object' ? (ref.url ?? ref.contentUrl) : ref, pageUrl)
    if (url) return url
  }
  return null
}

function ogImage(html: string, pageUrl: string): string | null {
  const tag = OG_IMAGE.exec(html)
  const content = tag ? CONTENT.exec(tag[0]) : null
  return content ? imageUrl(content[1]!.replaceAll('&amp;', '&'), pageUrl) : null
}

function variant(title: string, offer: Offer | undefined, fallback: Offer, pageUrl: string, image: string | null): RawVariant {
  return {
    title,
    url: offer?.url ?? pageUrl,
    price: offer?.price ?? fallback.price ?? '',
    // The struck-through price on these pages is the maker's own UVP, not an earlier selling price.
    compareAtPrice: null,
    grams: referenceGrams(offer) ?? referenceGrams(fallback),
    available: (offer?.availability ?? fallback.availability ?? '').endsWith('InStock'),
    image,
  }
}

const isProduct = (block: unknown) => typeof block === 'object' && block !== null && (block as { '@type'?: unknown })['@type'] === 'Product'

// Broken JSON-LD blocks are skipped; a Product block in an unexpected shape throws, so the
// scraper reports the page instead of silently losing it.
function productBlock(html: string, pageUrl: string): Product | undefined {
  for (const [, body] of html.matchAll(JSON_LD)) {
    let block: unknown
    try {
      block = JSON.parse(body!)
    } catch {
      continue
    }
    if (isProduct(block)) return parseWith(Product, block, `JSON-LD auf ${pageUrl}`)
  }
  return undefined
}

export function parseProductPage(html: string, pageUrl: string): RawProduct | null {
  const product = productBlock(html, pageUrl)
  if (!product) return null
  const { offers, model, brand } = product

  const variants = Array.isArray(model)
    ? model.map((m) => variant(m.model ?? m.name ?? '', m.offers, offers, m.url ?? pageUrl, jsonLdImage(m.image, pageUrl)))
    : [variant(model ?? '', offers, offers, pageUrl, null)]

  return {
    title: product.name,
    type: '',
    brand: (typeof brand === 'object' ? brand.name : brand) ?? null,
    image: jsonLdImage(product.image, pageUrl) ?? ogImage(html, pageUrl),
    variants,
  }
}
