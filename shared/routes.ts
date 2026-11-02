// The only place that spells internal URLs. The `proteinpreise/no-raw-route` lint rule and
// tests/routes.test.ts keep every other file going through these helpers.
//
// Google's URL rules this follows: words separated by hyphens, lowercase ASCII, and a trailing
// slash, because GitHub Pages serves each prerendered page from `<path>/index.html` and
// redirects the path without the slash.

export const ROUTES = {
  home: '/',
  compare: '/vergleich/',
  method: '/methodik/',
} as const

const OFFER_ID = /^([a-z0-9]+):([a-z0-9-]+):(\d+)$/
const ROUTE_ID = /^([a-z0-9]+)-([a-z0-9-]+)-(\d+)$/

// `esn:designer-whey-protein:908` <-> `esn-designer-whey-protein-908`. Shop ids carry no hyphen and
// sizes are digits only, so the first and last hyphen split the parts back apart.
export function toRouteId(id: string): string {
  const match = OFFER_ID.exec(id)
  if (!match) throw new Error(`Offer id is not url-safe: ${id}`)
  return `${match[1]}-${match[2]}-${match[3]}`
}

export function fromRouteId(routeId: string): string | null {
  const match = ROUTE_ID.exec(routeId)
  return match ? `${match[1]}:${match[2]}:${match[3]}` : null
}

export function offerPath(id: string): string {
  return `/angebot/${toRouteId(id)}/`
}

export function comparePath(a: string, b: string) {
  return { path: ROUTES.compare, query: { a: toRouteId(a), b: toRouteId(b) } }
}
