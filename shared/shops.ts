export interface Shop {
  id: string
  name: string
  domain: string
  gramsField?: 'net' | 'gross'
}

export const SHOPS: readonly Shop[] = [
  { id: 'esn', name: 'ESN', domain: 'esn.com' },
  { id: 'more', name: 'MORE Nutrition', domain: 'www.morenutrition.de' },
  { id: 'bodylab', name: 'Bodylab24', domain: 'www.bodylab24.de' },
  { id: 'innonature', name: 'innonature', domain: 'www.innonature.eu' },
  { id: 'gymqueen', name: 'GymQueen', domain: 'www.gymqueen.de' },
  { id: 'weider', name: 'Weider', domain: 'www.weider.de' },
  { id: 'ironmaxx', name: 'IronMaxx', domain: 'www.ironmaxx.de' },
  { id: 'peak', name: 'Peak', domain: 'www.peak.ag', gramsField: 'gross' },
]

const BY_ID = new Map(SHOPS.map((s) => [s.id, s]))

export function shopName(id: string): string {
  return BY_ID.get(id)?.name ?? id
}
