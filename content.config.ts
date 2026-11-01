import { defineCollection, defineContentConfig, z } from '@nuxt/content'
import { CATEGORIES } from './shared/types.ts'

const offer = z.object({
  id: z.string(),
  shopId: z.string(),
  product: z.string(),
  url: z.string().url(),
  category: z.enum(CATEGORIES),
  sizeG: z.number().int().positive(),
  priceCents: z.number().int().positive(),
  compareAtCents: z.number().int().positive().nullable(),
  flavors: z.number().int().positive(),
})

export default defineContentConfig({
  collections: {
    snapshots: defineCollection({
      type: 'data',
      source: 'snapshots/*.json',
      schema: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        fetchedAt: z.string(),
        shops: z.array(
          z.object({
            shopId: z.string(),
            ok: z.boolean(),
            offers: z.number().int().nonnegative(),
            error: z.string().optional(),
          }),
        ),
        offers: z.array(offer),
      }),
    }),
    pages: defineCollection({
      type: 'page',
      source: { include: 'pages/*.md', prefix: '/' },
    }),
  },
})
