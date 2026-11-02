import type { Snapshot } from '#shared/types'
import { shopBrand } from '#shared/brands'

export async function loadSnapshots(): Promise<Snapshot[]> {
  const items = await queryCollection('snapshots').order('date', 'ASC').all()
  return items.map(({ date, fetchedAt, shops, offers }) => ({
    date,
    fetchedAt,
    shops,
    offers: offers.map((o) => ({ ...o, image: o.image ?? null, brand: o.brand ?? shopBrand(o.shopId) })),
  }))
}
