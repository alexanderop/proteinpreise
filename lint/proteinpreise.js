// Local oxlint rules. Wired up in .oxlintrc.json.
import { readdirSync } from 'node:fs'

// Top-level page segments come from app/pages, so a new page is covered without touching this file.
const PAGES = readdirSync(new URL('../app/pages/', import.meta.url))
  .map((name) => name.replace(/\.vue$/, ''))
  .filter((name) => name !== 'index' && !name.startsWith('['))
const PAGE_PATH = new RegExp(`^/(?:${PAGES.join('|')})(?:[/?#]|$)`)
const ROUTES_FILE = /(?:^|\/)shared\/routes\.ts$/

const noRawRoute = {
  meta: {
    type: 'problem',
    docs: { description: 'Build internal URLs with the helpers in shared/routes.ts.' },
    messages: {
      raw: 'Internal URL "{{ value }}" spelled by hand. Use ROUTES, offerPath() or comparePath() from #shared/routes, so every link keeps hyphens and the trailing slash GitHub Pages serves.',
    },
  },
  create(context) {
    if (ROUTES_FILE.test(context.filename)) return {}
    const check = (node, value) => {
      if (typeof value !== 'string') return
      const linkTarget = node.parent?.type === 'Property' && ['to', 'path'].includes(node.parent.key?.name) && node.parent.value === node
      if (PAGE_PATH.test(value) || (linkTarget && value.startsWith('/'))) {
        context.report({ node, messageId: 'raw', data: { value } })
      }
    }
    return {
      Literal: (node) => check(node, node.value),
      TemplateLiteral: (node) => check(node, node.quasis[0]?.value.cooked),
    }
  },
}

export default {
  meta: { name: 'proteinpreise' },
  rules: { 'no-raw-route': noRawRoute },
}
