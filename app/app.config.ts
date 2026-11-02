// Layer 3 of the token system: Nuxt UI component defaults, built only from semantic utilities.
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'tomato',
      secondary: 'cobalt',
      info: 'cobalt',
      success: 'pine',
      warning: 'ochre',
      error: 'brick',
      neutral: 'sand',
    },
    button: {
      slots: { base: 'font-medium' },
    },
    card: {
      slots: {
        root: 'bg-surface shadow-card',
      },
      variants: {
        variant: {
          outline: { root: 'divide-y divide-default ring ring-default' },
        },
      },
    },
    badge: {
      slots: { base: 'font-mono tabular-nums' },
    },
    header: {
      slots: {
        root: 'bg-default/80 backdrop-blur border-b border-default',
      },
    },
    table: {
      slots: {
        th: 'eyebrow py-3',
        td: 'py-2.5 text-sm text-default',
        tr: 'hover:bg-elevated/60 transition-colors',
      },
    },
    modal: {
      slots: { content: 'bg-surface' },
    },
  },
})
