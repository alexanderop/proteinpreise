import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { classify, toOffers, type RawProduct } from '../shared/catalog.ts'
import { parseListing, parseProductPage } from '../shared/gambio.ts'
import { offerDrops, SnapshotRuns } from '../shared/health.ts'
import { parseProductsPage, productJsUrl, withNetGrams, type ShopifyProduct } from '../shared/shopify.ts'
import { SHOPS, type Shop, type Source } from '../shared/shops.ts'
import type { Offer, ShopRun, Snapshot } from '../shared/types.ts'
import { parseWith } from '../shared/validate.ts'

const USER_AGENT = 'proteinpreise/1.0 (daily price snapshot, one request per page)'
const PAGE_SIZE = 250
const MAX_PAGES = 40
const PAGE_DELAY_MS = 500
const TIMEOUT_MS = 20_000
const ATTEMPTS = 3
const MAX_RETRY_AFTER_MS = 60_000
const OUT_DIR = join(import.meta.dirname, '..', 'content', 'snapshots')

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

// Seconds or an HTTP date, capped so one shop cannot stall the whole run.
function retryAfterMs(header: string | null): number | null {
  if (header === null) return null
  const seconds = Number(header)
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now()
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), MAX_RETRY_AFTER_MS) : null
}

async function fetchText(url: string, accept: string): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let wait = PAGE_DELAY_MS * 4 * attempt
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (response.ok) return await response.text()
      lastError = new Error(`HTTP ${response.status} für ${url}`)
      // Other client errors (404, 403) will not fix themselves on a retry.
      if (response.status < 500 && response.status !== 429) throw lastError
      wait = retryAfterMs(response.headers.get('retry-after')) ?? wait
    } catch (error) {
      if (error === lastError) throw error
      lastError = error
    }
    if (attempt < ATTEMPTS) await sleep(wait)
  }
  throw lastError
}

async function fetchShopify(shop: Shop<'shopify'>): Promise<RawProduct[]> {
  const products: ShopifyProduct[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://${shop.domain}/products.json?limit=${PAGE_SIZE}&page=${page}`
    const batch = parseProductsPage(JSON.parse(await fetchText(url, 'application/json')), shop)
    if (batch.length === 0) return shop.gramsField === 'gross' ? withUnitPrices(shop, products) : products
    products.push(...batch)
    await sleep(PAGE_DELAY_MS)
  }
  throw new Error(`mehr als ${MAX_PAGES} Seiten, Abbruch`)
}

// Only the protein products need a second request: the rest are filtered out anyway.
async function withUnitPrices(shop: Shop<'shopify'>, products: ShopifyProduct[]): Promise<RawProduct[]> {
  const sized: RawProduct[] = []
  for (const product of products) {
    if (classify(product) === null) continue
    try {
      sized.push(withNetGrams(shop, product, JSON.parse(await fetchText(productJsUrl(shop, product), 'application/json'))))
    } catch (error) {
      console.warn(`::warning::${shop.id}: ${product.handle} ohne Grundpreis übersprungen (${message(error)})`)
    }
    await sleep(PAGE_DELAY_MS)
  }
  return sized
}

async function fetchGambio(shop: Shop<'gambio'>): Promise<RawProduct[]> {
  const pages = new Set<string>()
  for (const listing of shop.listings) {
    let next: string | null = new URL(listing, `https://${shop.domain}`).href
    for (let page = 1; next !== null; page++) {
      if (page > MAX_PAGES) throw new Error(`mehr als ${MAX_PAGES} Seiten in ${listing}, Abbruch`)
      const parsed = parseListing(await fetchText(next, 'text/html'), next)
      for (const url of parsed.products) pages.add(url)
      next = parsed.next
      await sleep(PAGE_DELAY_MS)
    }
  }
  const products: RawProduct[] = []
  for (const url of pages) {
    try {
      const product = parseProductPage(await fetchText(url, 'text/html'), url)
      if (product) products.push(product)
    } catch (error) {
      console.warn(`::warning::${shop.id}: ${url} übersprungen (${message(error)})`)
    }
    await sleep(PAGE_DELAY_MS)
  }
  if (products.length === 0) throw new Error(`keine Produktdaten auf ${pages.size} Produktseiten`)
  return products
}

const FETCHERS: { [S in Source]: (shop: Shop<S>) => Promise<RawProduct[]> } = {
  shopify: fetchShopify,
  gambio: fetchGambio,
}

function fetchCatalog<S extends Source>(shop: Shop<S>): Promise<RawProduct[]> {
  return FETCHERS[shop.source](shop)
}

async function scrapeShop(shop: Shop): Promise<{ run: ShopRun; offers: Offer[]; products: number }> {
  try {
    const products = await fetchCatalog(shop)
    const offers = toOffers(shop.id, products)
    return { run: { shopId: shop.id, ok: true, offers: offers.length }, offers, products: products.length }
  } catch (error) {
    return { run: { shopId: shop.id, ok: false, offers: 0, error: message(error) }, offers: [], products: 0 }
  }
}

function berlinDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now)
}

const now = new Date()
const results = await Promise.all(SHOPS.map(scrapeShop))

const snapshot: Snapshot = {
  date: berlinDate(now),
  fetchedAt: now.toISOString(),
  shops: results.map((r) => r.run),
  offers: results.flatMap((r) => r.offers).sort((a, b) => a.id.localeCompare(b.id)),
}

console.table(
  results.map(({ run, products }) => ({
    shop: run.shopId,
    ok: run.ok,
    produkte: products,
    angebote: run.offers,
    fehler: run.error ?? '',
  })),
)

if (results.every((r) => !r.run.ok)) {
  console.error('Kein Shop erreichbar, kein Snapshot geschrieben.')
  process.exit(1)
}

for (const run of snapshot.shops.filter((s) => !s.ok)) console.warn(`::warning::${run.shopId} fehlgeschlagen: ${run.error}`)

async function previousSnapshot(before: string) {
  const files = await readdir(OUT_DIR).catch(() => [])
  const latest = files.filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f < `${before}.json`).sort().at(-1)
  return latest ? parseWith(SnapshotRuns, JSON.parse(await readFile(join(OUT_DIR, latest), 'utf8')), latest) : null
}

const previous = await previousSnapshot(snapshot.date)
const drops = previous ? offerDrops(previous, snapshot) : []
if (drops.length > 0 && process.env.ALLOW_OFFER_DROP !== '1') {
  for (const d of drops) console.error(`::error::${d.shopId}: ${d.before} → ${d.after} Angebote seit ${previous!.date}`)
  console.error('Mehr als die Hälfte der Angebote eines Shops ist weg, kein Snapshot geschrieben. Bewusst? Mit ALLOW_OFFER_DROP=1 erneut starten.')
  process.exit(1)
}

await mkdir(OUT_DIR, { recursive: true })
const target = join(OUT_DIR, `${snapshot.date}.json`)
const temporary = `${target}.tmp`
await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`)
await rename(temporary, target)
console.log(`${snapshot.offers.length} Angebote aus ${snapshot.shops.filter((s) => s.ok).length}/${SHOPS.length} Shops nach ${target}`)
