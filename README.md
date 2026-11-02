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

The script reads every shop in `shared/shops.ts` through the fetcher for its `source`. A `shopify` shop is read from `https://<domain>/products.json` page by page. A `gambio` shop (Rühl24) is read from its category listings and the JSON-LD on each linked product page, one request at a time. The script keeps protein powders and writes `content/snapshots/<YYYY-MM-DD>.json` (date in Europe/Berlin). It prints one row per shop with the number of products read and offers kept. A shop that fails is recorded with `ok: false` and its error, and the other shops still land. If every shop fails, the script writes nothing and exits with code 1.

Running it twice on the same day overwrites that day's file.

## Build the static site

```sh
pnpm generate
npx serve .output/public
```

`pnpm generate` prerenders `/`, `/methodik/`, `/vergleich/`, and one `/angebot/<shop>-<slug>-<size>/` page (for example `/angebot/esn-designer-whey-protein-908/`) for every offer that appears in any snapshot. Every URL is built in `shared/routes.ts`; the `proteinpreise/no-raw-route` oxlint rule (`lint/proteinpreise.js`) and `tests/routes.test.ts` reject hand-written internal paths. `/vergleich/` is prerendered once and reads `?a=<id>&b=<id>` in the browser, so any pair of offers has a shareable comparison link without a page per pair. Links with a query are kept out of the prerender crawl in `nuxt.config.ts`. Upload `.output/public` to any static host: Netlify, Cloudflare Pages, GitHub Pages, or a plain web server.

## Check your change

```sh
pnpm test        # vitest: Shopify and Gambio parsing, classification, change detection
pnpm typecheck   # vue-tsc over the app, scripts, and tests
```

## Daily updates

`.github/workflows/scrape.yml` runs the scraper every day at 05:17 UTC and commits the new snapshot to the branch it ran on. It needs no secrets beyond the default `GITHUB_TOKEN`. Two things to know before you rely on it:

- A commit pushed with `GITHUB_TOKEN` does not start other workflows. If your host builds on push (Netlify, Cloudflare Pages), it picks up the commit. If you deploy with GitHub Actions, add the build and deploy steps to this workflow.
- If `main` is protected against direct pushes, the commit step fails.

## Where things live

- `shared/shops.ts` is the shop registry. Each row names its `source`. To add a Shopify shop, add one row. To add a Gambio shop, add one row with the category listings to start from.
- `shared/shopify.ts` and `shared/gambio.ts` parse each source into the same `RawProduct` shape. Both are pure. The Gambio tests read trimmed real pages from `tests/fixtures/`.
- `shared/catalog.ts` turns `RawProduct`s into offers. It holds the exclusion table (bars, coffee, bundles, samples), the ordered category table, and the size parser.
- `shared/prices.ts` derives everything the pages show from the snapshots: €/kg, the price series per offer, changes, new offers, and offers that left the catalog. Every function in it is pure and unit-tested.
- `shared/compare.ts` compares two offers per kilo from the catalog of every offer ever seen, including offers that left it. The compare page and the selection on the home table only render what it returns.
- `scripts/scrape.ts` is the only code that talks to the network.
- `content.config.ts` defines the `snapshots` data collection with a zod schema, and a `pages` collection for the Markdown in `content/pages/`.
- `app/assets/css/tokens.css` is the design token system, in three layers. Primitives are the OKLCH color scales (sand, tomato, pine, brick, cobalt, ochre), fonts and the type scale. Semantic tokens say what a value means (`--ui-text-muted`, `--app-price-down`, `--app-series-a`) and are exposed as utilities (`text-down`, `bg-series-a`, `bg-surface`). `app/app.config.ts` maps Nuxt UI's color aliases onto the scales and sets component defaults. `tests/design-tokens.test.ts` fails if a hex value, color function, palette utility (`text-red-500`) or palette variable appears anywhere in `app/` outside `tokens.css`.
- `@nuxtjs/seo` sets the title template, canonical URLs, the sitemap, Schema.org (a `Product` with brand and the shop's `Offer` on each offer page) and OG images. `app/components/OgImage/Proteinpreise.takumi.vue` is the OG template. With `ogImage.zeroRuntime` every image is rendered to a PNG during `pnpm generate`, so the static host only serves files. The template reads its colors from `tokens.css`. There is no `robots.txt`, because a GitHub Pages project site doesn't own the domain root. `NUXT_SITE_URL` is the origin only; the path comes from `NUXT_APP_BASE_URL`.
- `shared/brands.ts` maps each shop's vendor spelling ("IronMaxx® Nutrition", "BODYLAB") to one brand name. Products without a vendor get the shop's own label.
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
  image: string | null     // absolute https URL of the cheapest flavor's picture, else the product's
}

interface Snapshot {
  date: string             // YYYY-MM-DD
  fetchedAt: string
  shops: { shopId: string; ok: boolean; offers: number; error?: string }[]
  offers: Offer[]
}
```

Shopify offers take the variant's `featured_image`, else the product's first image. These are `cdn.shopify.com` URLs that accept `&width=<px>` to resize. Rühl24 offers take the flavor's JSON-LD image, else the product's, else `og:image`. Snapshots from before 2026-11-02 have no `image`; `shared/prices.ts` reads that as `null` and gives every `OfferRow` and `CatalogEntry` the last image seen for that offer.

`/methodik` on the site explains the rules in German, including why €/kg of powder is not €/kg of protein.
