export const CATEGORIES = ['isolate', 'whey', 'vegan', 'casein', 'mehrkomponenten'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABEL: Record<Category, string> = {
  isolate: 'Isolat',
  whey: 'Whey',
  vegan: 'Vegan',
  casein: 'Casein',
  mehrkomponenten: 'Mehrkomponenten',
}

export interface Offer {
  id: string
  shopId: string
  product: string
  url: string
  category: Category
  sizeG: number
  priceCents: number
  compareAtCents: number | null
  flavors: number
  image: string | null
  brand: string
}

export interface ShopRun {
  shopId: string
  ok: boolean
  offers: number
  error?: string
}

export interface Snapshot {
  date: string
  fetchedAt: string
  shops: ShopRun[]
  offers: Offer[]
}
