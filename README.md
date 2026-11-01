# Proteinpreise

A static site that lists protein powder prices from German online shops, highlights prices that changed since the last run, and draws each offer's price history with D3. Built with Nuxt 4, Nuxt Content 3, and D3 7.

Every price comes from a daily snapshot file in `content/snapshots/`. The site reads those files at build time and prerenders every page, so the output is plain HTML you can host anywhere.

## Run it locally

You need Node 26 and pnpm 11.

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

## Take a snapshot

```sh
node scripts/scrape.ts
```

The script fetches `https://<domain>/products.json` page by page from every shop in `shared/shops.ts`, keeps protein powders, and writes `content/snapshots/<YYYY-MM-DD>.json` (date in Europe/Berlin). It prints one row per shop with the number of products read and offers kept. A shop that fails is recorded with `ok: false` and its error, and the other shops still land. If every shop fails, the script writes nothing and exits with code 1.

Running it twice on the same day overwrites that day's file.

## Build the static site

```sh
pnpm generate
npx serve .output/public
```

`pnpm generate` prerenders `/`, `/methodik`, and one `/angebot/<id>` page for every offer that appears in any snapshot. Upload `.output/public` to any static host: Netlify, Cloudflare Pages, GitHub Pages, or a plain web server.

## Check your change

```sh
pnpm test        # vitest: parsing, classification, change detection
pnpm typecheck   # vue-tsc over the app, scripts, and tests
```

## Daily updates

`.github/workflows/scrape.yml` runs the scraper every day at 05:17 UTC and commits the new snapshot to the branch it ran on. It needs no secrets beyond the default `GITHUB_TOKEN`. Two things to know before you rely on it:

- A commit pushed with `GITHUB_TOKEN` does not start other workflows. If your host builds on push (Netlify, Cloudflare Pages), it picks up the commit. If you deploy with GitHub Actions, add the build and deploy steps to this workflow.
- If `main` is protected against direct pushes, the commit step fails.

## Where things live

- `shared/shops.ts` is the shop registry. To add a Shopify shop, add one row.
- `shared/catalog.ts` turns a raw Shopify catalog into offers. It holds the exclusion table (bars, coffee, bundles, samples), the ordered category table, and the size parser.
- `shared/prices.ts` derives everything the pages show from the snapshots: €/kg, the price series per offer, changes, new offers, and offers that left the catalog. Every function in it is pure and unit-tested.
- `scripts/scrape.ts` is the only code that talks to the network.
- `content.config.ts` defines the `snapshots` data collection with a zod schema, and a `pages` collection for the Markdown in `content/pages/`.
- `app/components/PriceChart.vue` and `app/components/Sparkline.vue` use D3 for scales and path shapes. Vue renders the SVG, so the charts prerender without a browser.

## Data shape

```ts
interface Offer {
  id: string               // `${shopId}:${productSlug}:${sizeG}`
  shopId: string
  product: string
  url: string
  category: 'isolate' | 'whey' | 'vegan' | 'casein' | 'mehrkomponenten'
  sizeG: number
  priceCents: number       // cheapest available flavor at this size
  compareAtCents: number | null
  flavors: number          // available flavors at this size
}

interface Snapshot {
  date: string             // YYYY-MM-DD
  fetchedAt: string
  shops: { shopId: string; ok: boolean; offers: number; error?: string }[]
  offers: Offer[]
}
```

`/methodik` on the site explains the rules in German, including why €/kg of powder is not €/kg of protein.
