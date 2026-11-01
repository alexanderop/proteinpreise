import type { Category, Offer } from './types.ts'

export interface RawVariant {
  title: string
  url: string
  price: string
  compareAtPrice: string | null
  grams: number | null
  available: boolean
}

export interface RawProduct {
  title: string
  type: string
  variants: RawVariant[]
}

export const MIN_SIZE_G = 200
const GRAMS_FALLBACK = { min: 100, max: 5000 }

export const EXCLUDED_PRODUCT_TYPES = /^(book|bundle|pakete|nem-paket|protein bar|proteinsnacks|protein shot|food bundle)$/i

export const EXCLUSIONS: readonly { reason: string; pattern: RegExp }[] = [
  { reason: 'Riegel und Snacks', pattern: /riegel|\bbars?\b|cookie|flips|wafer|chips|cracker|satisbites|proteino|cups?\b|soft core|crisp|spread|creme|\bnut\b/i },
  { reason: 'Mahlzeiten', pattern: /bowl|porridge|pudding|milchreis|grieß|pancake|waffle|m[uü]e?sli|wrap|sauce|cooking|dessert|backen|sahne|sachets/i },
  { reason: 'Kaffee und Getränke', pattern: /kaffee|coffee|cold brew|latte|matcha|milkyccino|chai|shot\b|drink|iced/i },
  { reason: 'Bundles und Proben', pattern: /bundle|deal|paket|\bset\b|kit\b|box|probe|probier|taster|kalender|doppelpack|^\d+\s*x\s|gratis|mix & match|mixed/i },
  { reason: 'Kein Pulver', pattern: /kollagen|collagen|shaker|kapseln|capsules|tabletten|buch\b/i },
]

const PROTEIN_POWDER = /protein|whey|casein|kasein|isolat/i
const MULTIPACK = /(?<![\d.,])([2-9]|\d{2,})\s*x\s*\d+(?:[.,]\d+)?\s*(?:g|ml)\b/
export const PLAUSIBLE_CENTS_PER_KG = { min: 800, max: 25000 }

export const CATEGORY_RULES: readonly { category: Category; pattern: RegExp }[] = [
  { category: 'mehrkomponenten', pattern: /vegan & whey/i },
  { category: 'vegan', pattern: /vegan|plant|soja|soy\b|erbsen|pea protein|reis ?protein|mandel|hanf|kürbis/i },
  { category: 'casein', pattern: /casein|kasein/i },
  { category: 'mehrkomponenten', pattern: /mehrkomponent|komplex|complex|3k-|hybrid|protein-6|blend/i },
  { category: 'isolate', pattern: /isolat|iso[ -]?whey|isoclear|clear|hydroly/i },
  { category: 'whey', pattern: /whey|molke/i },
  { category: 'mehrkomponenten', pattern: /protein/i },
]

export function classify(product: Pick<RawProduct, 'title' | 'type'>): Category | null {
  const name = baseName(product.title)
  if (EXCLUDED_PRODUCT_TYPES.test(product.type.trim())) return null
  if (MULTIPACK.test(product.title)) return null
  if (!PROTEIN_POWDER.test(name)) return null
  if (EXCLUSIONS.some((e) => e.pattern.test(name))) return null
  return CATEGORY_RULES.find((r) => r.pattern.test(name))?.category ?? null
}

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`
const MULTI_SIZE = new RegExp(String.raw`(?<![\d.,])(\d+)\s*x\s*${NUMBER}\s*(kg|g)\b`)
const SINGLE_SIZE = new RegExp(String.raw`(?<![\d.,])${NUMBER}\s*(kg|g)\b`)

function grams(amount: string, unit: string): number {
  const value = Number(amount.replace(',', '.'))
  return Math.round(unit === 'kg' ? value * 1000 : value)
}

export function parseSizeFromText(text: string): number | null {
  const multi = MULTI_SIZE.exec(text)
  if (multi) return Number(multi[1]) * grams(multi[2]!, multi[3]!)
  const single = SINGLE_SIZE.exec(text)
  if (single) return grams(single[1]!, single[2]!)
  return null
}

export function variantSize(variant: Pick<RawVariant, 'title' | 'grams'>, productTitle: string): number | null {
  const fromText = parseSizeFromText(variant.title) ?? parseSizeFromText(productTitle)
  if (fromText !== null) return fromText
  const { grams } = variant
  return grams !== null && grams >= GRAMS_FALLBACK.min && grams <= GRAMS_FALLBACK.max ? grams : null
}

export function toCents(price: string | null): number | null {
  if (price === null || price.trim() === '') return null
  const cents = Math.round(Number(price) * 100)
  return Number.isFinite(cents) && cents > 0 ? cents : null
}

const SIZE_IN_PARENS = /\s*\((?:\d+\s*x\s*)?\d+(?:[.,]\d+)?\s*(?:kg|g)\)/g

export function baseName(title: string): string {
  const [head] = title.split(/\s+[-–]\s+/)
  return (head ?? title).replace(SIZE_IN_PARENS, '').replace(/\s+/g, ' ').trim()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function toOffers(shopId: string, products: readonly RawProduct[]): Offer[] {
  const groups = new Map<string, { best: Offer; flavors: number }>()

  for (const product of products) {
    const name = baseName(product.title)
    const category = classify(product)
    if (!category) continue
    const slug = slugify(name)

    for (const variant of product.variants) {
      if (!variant.available) continue
      const priceCents = toCents(variant.price)
      if (priceCents === null) continue
      const sizeG = variantSize(variant, product.title)
      if (sizeG === null || sizeG < MIN_SIZE_G) continue
      const centsPerKg = (priceCents * 1000) / sizeG
      if (centsPerKg < PLAUSIBLE_CENTS_PER_KG.min || centsPerKg > PLAUSIBLE_CENTS_PER_KG.max) continue

      const id = `${shopId}:${slug}:${sizeG}`
      const candidate: Offer = {
        id,
        shopId,
        product: name,
        url: variant.url,
        category,
        sizeG,
        priceCents,
        compareAtCents: toCents(variant.compareAtPrice),
        flavors: 1,
      }
      const group = groups.get(id)
      if (!group) {
        groups.set(id, { best: candidate, flavors: 1 })
        continue
      }
      group.flavors += 1
      if (candidate.priceCents < group.best.priceCents) group.best = candidate
    }
  }

  return [...groups.values()]
    .map(({ best, flavors }) => ({ ...best, flavors }))
    .sort((a, b) => a.id.localeCompare(b.id))
}
