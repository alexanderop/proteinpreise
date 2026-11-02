import * as v from 'valibot'
import type { Snapshot } from './types.ts'

// Just the part of a stored snapshot the drop check reads.
export const SnapshotRuns = v.object({
  date: v.string(),
  shops: v.array(v.object({ shopId: v.string(), ok: v.boolean(), offers: v.number() })),
})

export const DROP_RATIO = 0.5
const MIN_OFFERS_TO_COMPARE = 4

export interface Drop {
  shopId: string
  before: number
  after: number
}

// A shop that still answers but lists far fewer offers than yesterday usually means a
// parser or classifier stopped matching, not that the shop sold out overnight.
export function offerDrops(previous: Pick<Snapshot, 'shops'>, current: Pick<Snapshot, 'shops'>): Drop[] {
  const before = new Map(previous.shops.filter((s) => s.ok).map((s) => [s.shopId, s.offers]))
  return current.shops.flatMap((run) => {
    const was = before.get(run.shopId)
    if (!run.ok || was === undefined || was < MIN_OFFERS_TO_COMPARE) return []
    return run.offers < was * DROP_RATIO ? [{ shopId: run.shopId, before: was, after: run.offers }] : []
  })
}
