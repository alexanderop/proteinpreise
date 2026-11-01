import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseProductsPage, toOffers, type RawProduct } from '../shared/catalog.ts'
import { SHOPS, type Shop } from '../shared/shops.ts'
import type { Offer, ShopRun, Snapshot } from '../shared/types.ts'

const USER_AGENT = 'proteinpreise/1.0 (daily price snapshot, one request per page)'
const PAGE_SIZE = 250
const MAX_PAGES = 40
const PAGE_DELAY_MS = 500
const TIMEOUT_MS = 20_000
const OUT_DIR = join(import.meta.dirname, '..', 'content', 'snapshots')

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchPage(shop: Shop, page: number): Promise<RawProduct[]> {
  const url = `https://${shop.domain}/products.json?limit=${PAGE_SIZE}&page=${page}`
  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} für Seite ${page}`)
      return parseProductsPage(await response.json())
    } catch (error) {
      lastError = error
      await sleep(PAGE_DELAY_MS * 4)
    }
  }
  throw lastError
}

async function fetchCatalog(shop: Shop): Promise<RawProduct[]> {
  const products: RawProduct[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchPage(shop, page)
    if (batch.length === 0) return products
    products.push(...batch)
    await sleep(PAGE_DELAY_MS)
  }
  throw new Error(`mehr als ${MAX_PAGES} Seiten, Abbruch`)
}

async function scrapeShop(shop: Shop): Promise<{ run: ShopRun; offers: Offer[]; products: number }> {
  try {
    const products = await fetchCatalog(shop)
    const offers = toOffers(shop, products)
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
