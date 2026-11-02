import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { toOffers } from '../shared/catalog.ts'
import { parseListing, parseProductPage } from '../shared/gambio.ts'

const fixture = (name: string) => readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')
const page = (name: string, url: string) => parseProductPage(fixture(name), url)

describe('parseListing', () => {
  it('collects product links and stops on the last page', () => {
    expect(parseListing(fixture('ruehl24-listing.html'), 'https://www.ruehl24.de/de/protein/')).toEqual({
      products: [
        'https://www.ruehl24.de/de/protein/proteinriegel/protein-riegel-box-mit-12-stueck-je-50g.html',
        'https://www.ruehl24.de/de/protein/protein-crispies-77-prozent-protein.html',
        'https://www.ruehl24.de/de/protein/sahne-protein/sahne-protein-700g.html',
      ],
      next: null,
    })
  })

  it('follows the next-page link', () => {
    const listing = parseListing(fixture('ruehl24-listing-paged.html'), 'https://www.ruehl24.de/de/bekleidung/')
    expect(listing.products).toHaveLength(2)
    expect(listing.next).toBe('https://www.ruehl24.de/de/bekleidung/?page=2')
  })

  it('ignores links to other sites', () => {
    const html = '<a href="https://evil.example/x.html" class="product-url ">x</a>'
    expect(parseListing(html, 'https://www.ruehl24.de/de/protein/').products).toEqual([])
  })
})

describe('parseProductPage', () => {
  it('turns every flavor model into a variant, sized by its name or its unit price', () => {
    const product = page('ruehl24-whey-konzentrat.html', 'https://www.ruehl24.de/de/ruehls-bestes-whey-protein-konzentrat.html')
    expect(product?.title).toBe('Whey Protein Konzentrat')
    expect(product?.variants.map((v) => [v.title, v.price, v.grams, v.available])).toEqual([
      ['WPKonzentrat-500g-Milchschokolade', '15.71', 500, true],
      ['WPKonzentrat-500g-Apfelstrudel', '15.71', 500, false],
      ['WPKonzentrat-1000g-Milchschokolade', '27.71', 1000, true],
      ['WPKonzentrat-1000g-Vanille', '27.71', 1000, true],
    ])
  })

  it('reads the maker from the JSON-LD brand, or null when the page names none', () => {
    expect(page('ruehl24-zero-l-super-instant.html', 'https://www.ruehl24.de/de/x.html')?.brand).toBe('Rühls Bestes')
    expect(page('ruehl24-casein.html', 'https://www.ruehl24.de/de/x.html')?.brand).toBeNull()
  })

  it('reads a product without flavor models as one variant', () => {
    const product = page('ruehl24-zero-l-super-instant.html', 'https://www.ruehl24.de/de/x.html')
    expect(product?.variants).toEqual([
      {
        title: 'C. WPI-Zero',
        url: 'https://www.ruehl24.de/de/protein/whey-protein-isolat/whey-protein-isolat-zero-l-laktosefrei-super-instant.html',
        price: '38.95',
        compareAtPrice: null,
        grams: 900,
        available: true,
        image: null,
      },
    ])
  })

  it('reads the product image from JSON-LD as an array, an ImageObject, or a protocol-relative URL', () => {
    const whey = page('ruehl24-whey-konzentrat.html', 'https://www.ruehl24.de/de/x.html')
    expect(whey?.image).toBe('https://www.ruehl24.de/images/product_images/info_images/WPK-Vanille%20(1).jpg')
    expect(whey?.variants.map((v) => v.image)).toEqual([
      'https://www.ruehl24.de/images/product_images/info_images/WPK-Milchschokolade.jpg',
      null,
      null,
      null,
    ])
    expect(page('ruehl24-casein.html', 'https://www.ruehl24.de/de/x.html')?.image).toBe(
      'https://www.ruehl24.de/images/product_images/info_images/Casein-Milchschokolade.jpg',
    )
  })

  it('falls back to og:image over https, and to null without either', () => {
    expect(page('ruehl24-zero-l-super-instant.html', 'https://www.ruehl24.de/de/x.html')?.image).toBe(
      'https://www.ruehl24.de/images/product_images/info_images/WPI-Zero-L.jpg',
    )
    const bare = fixture('ruehl24-zero-l-super-instant.html').replace(/<meta property="og:image"[^>]*>/, '')
    expect(parseProductPage(bare, 'https://www.ruehl24.de/de/x.html')?.image).toBeNull()
  })

  it('skips a broken JSON-LD block and still finds the product block after it', () => {
    const broken = fixture('ruehl24-casein.html').replace('<script type="application/ld+json">', '<script type="application/ld+json">{ not json</script><script type="application/ld+json">')
    expect(parseProductPage(broken, 'https://www.ruehl24.de/de/x.html')?.title).toBe(page('ruehl24-casein.html', 'https://www.ruehl24.de/de/x.html')?.title)
    expect(parseProductPage('<script type="application/ld+json">{ not json</script>', 'https://www.ruehl24.de/de/x.html')).toBeNull()
  })

  it('returns null for a page without product data', () => {
    expect(parseProductPage(fixture('ruehl24-listing.html'), 'https://www.ruehl24.de/de/protein/')).toBeNull()
  })
})

describe('Rühl24 offers', () => {
  const offers = toOffers('ruehl', [
    page('ruehl24-whey-konzentrat.html', 'https://www.ruehl24.de/de/ruehls-bestes-whey-protein-konzentrat.html')!,
    page('ruehl24-zero-l-super-instant.html', 'https://www.ruehl24.de/de/x.html')!,
    page('ruehl24-casein.html', 'https://www.ruehl24.de/de/protein/casein-protein/casein-protein.html')!,
  ])

  it('keeps one offer per product and size with the cheapest in-stock flavor, ignoring the UVP', () => {
    expect(offers.map((o) => [o.id, o.category, o.priceCents, o.compareAtCents, o.flavors])).toEqual([
      ['ruehl:casein-protein-instant:1000', 'casein', 2695, null, 2],
      ['ruehl:whey-protein-isolat-zero-l-super-instant-pur:900', 'isolate', 3895, null, 1],
      ['ruehl:whey-protein-konzentrat:1000', 'whey', 2771, null, 2],
      ['ruehl:whey-protein-konzentrat:500', 'whey', 1571, null, 1],
    ])
  })

  it('pictures each offer with its flavor image, else the product image', () => {
    expect(offers.map((o) => [o.id, o.image])).toEqual([
      ['ruehl:casein-protein-instant:1000', 'https://www.ruehl24.de/images/product_images/info_images/Casein-Milchschokolade.jpg'],
      ['ruehl:whey-protein-isolat-zero-l-super-instant-pur:900', 'https://www.ruehl24.de/images/product_images/info_images/WPI-Zero-L.jpg'],
      ['ruehl:whey-protein-konzentrat:1000', 'https://www.ruehl24.de/images/product_images/info_images/WPK-Vanille%20(1).jpg'],
      ['ruehl:whey-protein-konzentrat:500', 'https://www.ruehl24.de/images/product_images/info_images/WPK-Milchschokolade.jpg'],
    ])
  })

  it('links each offer to its flavor', () => {
    expect(offers.find((o) => o.id === 'ruehl:whey-protein-konzentrat:500')?.url).toBe(
      'https://www.ruehl24.de/de/ruehls-bestes-whey-protein-konzentrat.html?combi_id=2694',
    )
  })
})
