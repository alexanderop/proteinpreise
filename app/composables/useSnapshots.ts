import type { Snapshot } from '#shared/types'

export async function loadSnapshots(): Promise<Snapshot[]> {
  const items = await queryCollection('snapshots').order('date', 'ASC').all()
  return items.map(({ date, fetchedAt, shops, offers }) => ({ date, fetchedAt, shops, offers }))
}
