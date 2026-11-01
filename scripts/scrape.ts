import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { toOffers, type RawProduct } from '../shared/catalog.ts'
import { parseListing, parseProductPage } from '../shared/gambio.ts'
import { parseProductsPage } from '../shared/shopify.ts'
import { SHOPS, type Shop, type Source } from '../shared/shops.ts'
import type { Offer, ShopRun, Snapshot } from '../shared/types.ts'

const USER_AGENT = 'proteinpreise/1.0 (daily price snapshot, one request per page)'
const PAGE_SIZE = 250
const MAX_PAGES = 40
const PAGE_DELAY_MS = 500
const TIMEOUT_MS = 20_000
const OUT_DIR = join(import.meta.dirname, '..', 'content', 'snapshots')

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchText(url: string, accept: string): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} für ${url}`)
      return await response.text()
    } catch (error) {
      lastError = error
      await sleep(PAGE_DELAY_MS * 4)
    }
  }
  throw lastError
}

async function fetchShopify(shop: Shop<'shopify'>): Promise<RawProduct[]> {
  const products: RawProduct[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://${shop.domain}/products.json?limit=${PAGE_SIZE}&page=${page}`
    const batch = parseProductsPage(JSON.parse(await fetchText(url, 'application/json')), shop)
    if (batch.length === 0) return products
    products.push(...batch)
    await sleep(PAGE_DELAY_MS)
  }
  throw new Error(`mehr als ${MAX_PAGES} Seiten, Abbruch`)
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
    const product = parseProductPage(await fetchText(url, 'text/html'), url)
    if (product) products.push(product)
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
    const message = error instanceof Error ? error.message : String(error)
    return { run: { shopId: shop.id, ok: false, offers: 0, error: message }, offers: [], products: 0 }
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

await mkdir(OUT_DIR, { recursive: true })
const target = join(OUT_DIR, `${snapshot.date}.json`)
const temporary = `${target}.tmp`
await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`)
await rename(temporary, target)
console.log(`${snapshot.offers.length} Angebote aus ${snapshot.shops.filter((s) => s.ok).length}/${SHOPS.length} Shops nach ${target}`)
