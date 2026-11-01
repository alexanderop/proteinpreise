interface SourceConfig {
  shopify: { gramsField?: 'net' | 'gross' }
}

export type Source = keyof SourceConfig

export type Shop<S extends Source = Source> = {
  [K in S]: { id: string; name: string; domain: string; source: K } & SourceConfig[K]
}[S]

export const SHOPS: readonly Shop[] = [
  { id: 'esn', name: 'ESN', domain: 'esn.com', source: 'shopify' },
  { id: 'more', name: 'MORE Nutrition', domain: 'www.morenutrition.de', source: 'shopify' },
  { id: 'bodylab', name: 'Bodylab24', domain: 'www.bodylab24.de', source: 'shopify' },
  { id: 'innonature', name: 'innonature', domain: 'www.innonature.eu', source: 'shopify' },
  { id: 'gymqueen', name: 'GymQueen', domain: 'www.gymqueen.de', source: 'shopify' },
  { id: 'weider', name: 'Weider', domain: 'www.weider.de', source: 'shopify' },
  { id: 'ironmaxx', name: 'IronMaxx', domain: 'www.ironmaxx.de', source: 'shopify' },
  { id: 'peak', name: 'Peak', domain: 'www.peak.ag', source: 'shopify', gramsField: 'gross' },
]

const BY_ID = new Map(SHOPS.map((s) => [s.id, s]))

export function shopName(id: string): string {
  return BY_ID.get(id)?.name ?? id
}
