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
  css: ['~/assets/main.css'],
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
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap',
        },
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
