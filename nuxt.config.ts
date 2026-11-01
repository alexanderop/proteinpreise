import { readdirSync, readFileSync } from 'node:fs'
import { SHOPS } from './shared/shops.ts'
import { toRouteId } from './shared/prices.ts'

function offerRoutes(): string[] {
  const dir = new URL('./content/snapshots/', import.meta.url)
  const ids = new Set<string>()
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const snapshot = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as { offers: { id: string }[] }
    for (const offer of snapshot.offers) ids.add(offer.id)
  }
  return [...ids].map((id) => `/angebot/${toRouteId(id)}`)
}

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  modules: ['@nuxt/content'],
  devtools: { enabled: false },
  css: ['~/assets/fonts.css', '~/assets/main.css'],
  content: {
    experimental: { sqliteConnector: 'native' },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      title: 'Proteinpreise',
      meta: [
        { name: 'description', content: `Tägliche Preise für Proteinpulver aus ${SHOPS.length} deutschen Online-Shops, mit Preisverlauf.` },
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
      routes: ['/', '/methodik', ...offerRoutes()],
    },
  },
})
