import { readdirSync, readFileSync } from 'node:fs'
import { SHOPS } from './shared/shops.ts'
import { ROUTES, offerPath } from './shared/routes.ts'

function offerRoutes(): string[] {
  const dir = new URL('./content/snapshots/', import.meta.url)
  const ids = new Set<string>()
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const snapshot = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as { offers: { id: string }[] }
    for (const offer of snapshot.offers) ids.add(offer.id)
  }
  return [...ids].map(offerPath)
}

const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF'

// Self-hosted woff2 files in public/fonts, one face per weight and subset. `global` makes them
// available to the OG image renderer too.
function localFamily(name: string, file: string, weights: (number | string)[]) {
  return weights.flatMap((weight) =>
    (
      [
        ['latin', LATIN],
        ['latin-ext', LATIN_EXT],
      ] as const
    ).map(([subset, unicodeRange]) => ({
      name,
      src: `/fonts/${file}-${String(weight).replace(' ', '-')}-normal-${subset}.woff2`,
      weight,
      style: 'normal' as const,
      unicodeRange,
      display: 'swap' as const,
      global: true,
    })),
  )
}

// Origin only; the GitHub Pages path comes from NUXT_APP_BASE_URL.
const SITE_URL = process.env.NUXT_SITE_URL ?? 'https://alexanderop.github.io'
const BASE_URL = process.env.NUXT_APP_BASE_URL ?? '/'
const DESCRIPTION = `Tägliche Preise für Proteinpulver aus ${SHOPS.length} deutschen Online-Shops, pro Kilo umgerechnet, mit Preisverlauf und Vergleich.`

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  modules: ['@nuxt/ui', '@nuxt/fonts', '@nuxt/content', '@nuxtjs/seo'],
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  ui: {
    // Fonts are self-hosted in app/assets/css/fonts.css.
    fonts: false,
    theme: {
      colors: ['primary', 'secondary', 'info', 'success', 'warning', 'error', 'neutral'],
    },
  },
  fonts: {
    // Every font ships from this repo; no remote font provider is ever asked.
    providers: { google: false, googleicons: false, bunny: false, fontshare: false, fontsource: false, adobe: false, npm: false },
    families: [
      ...localFamily('Fraunces', 'fraunces', ['400 800']),
      ...localFamily('IBM Plex Sans', 'ibm-plex-sans', [400, 500, 600]),
      ...localFamily('IBM Plex Mono', 'ibm-plex-mono', [400, 500, 600]),
    ],
  },
  site: {
    url: SITE_URL,
    name: 'Proteinpreise',
    description: DESCRIPTION,
    defaultLocale: 'de',
    // GitHub Pages serves every page from `<path>/index.html`, so the slash form is the one that answers 200.
    trailingSlash: true,
  },
  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'Proteinpreise',
      url: SITE_URL,
      logo: '/favicon.svg',
    },
  },
  ogImage: {
    // Every OG image is rendered once at build time; the static host only serves PNGs.
    zeroRuntime: true,
    defaults: { width: 1200, height: 630 },
  },
  robots: {
    // Crawlers only read /robots.txt at the domain root, which a GitHub Pages project site does not own.
    // Robots meta tags are still set on every page.
    robotsTxt: false,
  },
  sitemap: {
    // /vergleich?a=…&b=… pairs are client-only views of the same page.
    exclude: [`${ROUTES.compare}?**`],
  },
  // Static GitHub Pages site: no AI endpoints, no deploy skew handling, no runtime link checks.
  aiReady: false,
  skewProtection: false,
  linkChecker: { enabled: false },
  colorMode: {
    storageKey: 'theme',
  },
  icon: {
    // The site is static: every icon ships in the client bundle, nothing is fetched at runtime.
    provider: 'none',
    fallbackToApi: false,
    clientBundle: {
      scan: true,
      icons: [
        'lucide:chevron-down',
        'lucide:chevron-right',
        'lucide:chevron-left',
        'lucide:x',
        'lucide:check',
        'lucide:search',
        'lucide:menu',
        'lucide:sun',
        'lucide:moon',
        'lucide:loader-circle',
        'lucide:arrow-up',
        'lucide:arrow-down',
        'lucide:arrow-up-down',
        'lucide:arrow-right',
        'lucide:arrow-left-right',
        'lucide:external-link',
        'lucide:plus',
        'lucide:minus',
        'lucide:trending-down',
        'lucide:trending-up',
        'lucide:circle-alert',
        'lucide:info',
        'lucide:package',
        'lucide:tag',
      ],
    },
  },
  experimental: {
    // Backstop for links that reach NuxtLink without a slash (Nuxt UI internals, content links).
    defaults: { nuxtLink: { trailingSlash: 'append' } },
  },
  content: {
    experimental: { sqliteConnector: 'native' },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      meta: [
        { name: 'color-scheme', content: 'light dark' },
      ],
      link: [
        { rel: 'icon', href: `${process.env.NUXT_APP_BASE_URL ?? '/'}favicon.svg`, type: 'image/svg+xml' },
      ],
    },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: [ROUTES.home, ROUTES.method, ROUTES.compare, ...offerRoutes()],
      ignore: [
        /\/vergleich\/?\?/,
        // The crawler also follows the logo link to the base path itself, which the sitemap would list as a second home page.
        ...(BASE_URL === '/' ? [] : [new RegExp(`^${BASE_URL}$`)]),
      ],
    },
  },
})
