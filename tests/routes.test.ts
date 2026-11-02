import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROUTES, comparePath, fromRouteId, offerPath, toRouteId } from '../shared/routes.ts'
import { SHOPS } from '../shared/shops.ts'

const ROOT = new URL('..', import.meta.url).pathname
// Google: lowercase ASCII, words split by hyphens, no underscores. GitHub Pages: trailing slash.
const GOOD_PATH = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/

function snapshotIds(): string[] {
  const dir = join(ROOT, 'content/snapshots')
  const ids = new Set<string>()
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const snapshot = JSON.parse(readFileSync(join(dir, file), 'utf8')) as { offers: { id: string }[] }
    for (const offer of snapshot.offers) ids.add(offer.id)
  }
  return [...ids]
}

describe('route ids', () => {
  it('round-trips an offer id through a hyphenated form', () => {
    const id = 'esn:designer-whey-protein:908'
    expect(toRouteId(id)).toBe('esn-designer-whey-protein-908')
    expect(fromRouteId(toRouteId(id))).toBe(id)
  })

  it('rejects route ids that do not split into shop, slug and size', () => {
    expect(fromRouteId('esn_designer_908')).toBeNull()
    expect(fromRouteId('esn-designer')).toBeNull()
  })

  it('keeps shop ids free of hyphens, so the first hyphen marks the shop', () => {
    for (const shop of SHOPS) expect(shop.id).toMatch(/^[a-z0-9]+$/)
  })

  it('gives every recorded offer a crawlable path that maps back to it', () => {
    const ids = snapshotIds()
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(offerPath(id)).toMatch(GOOD_PATH)
      expect(fromRouteId(toRouteId(id))).toBe(id)
    }
  })
})

describe('static routes', () => {
  it('end every page path with a slash and use hyphens only', () => {
    for (const path of Object.values(ROUTES)) expect(path).toMatch(GOOD_PATH)
    expect(comparePath('esn:a:1', 'peak:b:2')).toEqual({ path: '/vergleich/', query: { a: 'esn-a-1', b: 'peak-b-2' } })
  })
})

// oxlint reads only the <script> block of a .vue file, so the templates are checked here.
describe('templates', () => {
  function vueFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return vueFiles(path)
      return name.endsWith('.vue') ? [path] : []
    })
  }

  it('spell no internal URL by hand', () => {
    const raw = /\b(?:to|href|path)="\/|[`'"]\/(?:angebot|vergleich|methodik)\b/
    const offenders = vueFiles(join(ROOT, 'app')).flatMap((file) => {
      const template = readFileSync(file, 'utf8').match(/<template>[\s\S]*<\/template>/)?.[0] ?? ''
      return template
        .split('\n')
        .filter((line) => raw.test(line))
        .map((line) => `${relative(ROOT, file)}: ${line.trim()}`)
    })
    expect(offenders, 'use ROUTES, offerPath() or comparePath() from #shared/routes').toEqual([])
  })
})
