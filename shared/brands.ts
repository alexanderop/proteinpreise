import { shopName } from './shops.ts'

// Shops spell the same maker many ways ("IronMaxx® Nutrition", "Weider Germany ", "BODYLAB").
// Each alias maps every spelling of one maker to the name shown on the site.
const ALIASES: readonly [RegExp, string][] = [
  [/^bodylab/i, 'Bodylab'],
  [/^esn(\.com)?$/i, 'ESN'],
  [/^(more|quality first)\b/i, 'MORE Nutrition'],
  [/^innonature/i, 'innonature'],
  [/^weider/i, 'Weider'],
  [/^ironmaxx/i, 'IronMaxx'],
  [/^peak\b/i, 'Peak'],
  [/^gymqueen/i, 'GymQueen'],
  [/^rühl/i, 'Rühls Bestes'],
  [/^vom achterhof/i, 'Vom Achterhof'],
  [/^optimum nutrition/i, 'Optimum Nutrition'],
  [/^scitec/i, 'Scitec Nutrition'],
  [/^biotech usa/i, 'BioTech USA'],
  [/^zec plus/i, 'ZEC+ Nutrition'],
  [/^c\.p\. sports/i, 'C.P. Sports'],
  [/^dr\. niedermaier/i, 'Dr. Niedermaier'],
  [/^gu energy/i, 'GU Energy Labs'],
]

const titleCase = (value: string) =>
  value === value.toUpperCase() ? value.toLowerCase().replace(/(^|[\s.-])(\p{L})/gu, (m) => m.toUpperCase()) : value

export function brandName(raw: unknown, fallback: string): string {
  const clean = typeof raw === 'string' ? raw.replace(/[®™]/g, '').replace(/\s+/g, ' ').trim() : ''
  if (!clean) return fallback
  return ALIASES.find(([pattern]) => pattern.test(clean))?.[1] ?? titleCase(clean)
}

// A product without a maker is the shop's own label.
export function shopBrand(shopId: string): string {
  return brandName(shopName(shopId), shopName(shopId))
}
