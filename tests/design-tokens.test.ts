import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Raw color values live only in the token file. Everything else uses semantic tokens.
const ROOT = new URL('..', import.meta.url).pathname
const TOKEN_FILES = new Set(['app/assets/css/tokens.css'])

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(vue|ts|css)$/.test(name) ? [path] : []
  })
}

const PALETTE =
  'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white|sand|tomato|pine|brick|cobalt|ochre'

const RULES: { name: string; pattern: RegExp; fix: string }[] = [
  { name: 'hex color', pattern: /[:(,'"]\s*#[0-9a-f]{3,8}\b/gi, fix: 'add a token in tokens.css' },
  { name: 'color function', pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g, fix: 'add a token in tokens.css' },
  {
    name: 'palette utility',
    pattern: new RegExp(
      String.raw`(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|to|via|outline|divide|decoration|shadow|accent|caret)-(?:${PALETTE})(?:-\d{2,3})?(?![\w-])`,
      'g',
    ),
    fix: 'use a semantic utility (bg-surface, text-muted, text-down, bg-series-a, …)',
  },
  { name: 'arbitrary color', pattern: /-\[(?:#|rgb|hsl|oklch|color-mix)/g, fix: 'use a semantic utility' },
  {
    name: 'palette variable',
    pattern: /var\(--(?:color-(?:sand|tomato|pine|brick|cobalt|ochre|white|black)|ui-color-)/g,
    fix: 'reference a semantic variable (--ui-text-muted, --app-price-down, …)',
  },
]

const sources = files(join(ROOT, 'app'))
  .map((path) => ({ path: relative(ROOT, path), text: readFileSync(path, 'utf8') }))
  .filter((f) => !TOKEN_FILES.has(f.path) && !f.path.endsWith('fonts.css'))

describe('design tokens', () => {
  it('finds the app sources', () => {
    expect(sources.length).toBeGreaterThan(10)
  })

  for (const rule of RULES) {
    it(`has no ${rule.name} outside tokens.css`, () => {
      const hits = sources.flatMap(({ path, text }) =>
        text.split('\n').flatMap((line, i) =>
          [...line.matchAll(rule.pattern)].map((m) => `${path}:${i + 1}  ${m[0].trim()}  → ${rule.fix}`),
        ),
      )
      expect(hits).toEqual([])
    })
  }
})
