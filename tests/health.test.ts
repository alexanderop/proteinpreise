import { describe, expect, it } from 'vitest'
import { offerDrops } from '../shared/health.ts'
import type { ShopRun } from '../shared/types.ts'

const runs = (...shops: ShopRun[]) => ({ shops })
const ok = (shopId: string, offers: number): ShopRun => ({ shopId, ok: true, offers })

describe('offerDrops', () => {
  it('flags a shop that lost more than half its offers', () => {
    expect(offerDrops(runs(ok('esn', 15), ok('more', 4)), runs(ok('esn', 7), ok('more', 4)))).toEqual([{ shopId: 'esn', before: 15, after: 7 }])
  })

  it('accepts a drop to exactly half, and any growth', () => {
    expect(offerDrops(runs(ok('esn', 16), ok('peak', 5)), runs(ok('esn', 8), ok('peak', 19)))).toEqual([])
  })

  it('ignores tiny shops, failed runs and shops new today', () => {
    const failed: ShopRun = { shopId: 'more', ok: false, offers: 0, error: 'HTTP 500' }
    expect(offerDrops(runs(ok('inno', 3), ok('more', 10), { ...failed, shopId: 'esn' }), runs(ok('inno', 0), failed, ok('esn', 1), ok('new', 0)))).toEqual([])
  })
})
