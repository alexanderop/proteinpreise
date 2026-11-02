<script setup lang="ts">
import tokens from '~/assets/css/tokens.css?raw'

// The OG renderer cannot read the page's CSS variables and has no color mode, so the light
// primitives are read straight from tokens.css, which stays the only place colors are written.
function primitive(name: string): string {
  const value = new RegExp(`--color-${name}:\\s*([^;]+);`).exec(tokens)?.[1]
  if (!value) throw new Error(`tokens.css has no --color-${name}`)
  return value.trim()
}

const c = {
  page: primitive('sand-50'),
  ink: primitive('sand-950'),
  text: primitive('sand-800'),
  muted: primitive('sand-600'),
  accent: primitive('tomato-600'),
  photo: 'white',
}

withDefaults(
  defineProps<{
    title: string
    eyebrow?: string
    price?: string
    perKg?: string
    note?: string
    image?: string | null
  }>(),
  { eyebrow: '', price: '', perKg: '', note: '', image: null },
)
</script>

<template>
  <div class="flex h-[630px] w-[1200px] flex-col px-16 pt-14 pb-12" :style="{ fontFamily: 'IBM Plex Sans', backgroundColor: c.page, color: c.text }">
    <div class="flex w-full items-center justify-between">
      <div class="flex items-baseline text-[44px] leading-none" :style="{ fontFamily: 'Fraunces', color: c.ink }">
        <span style="font-weight: 800">Protein</span><span :style="{ fontStyle: 'italic', fontWeight: 400, color: c.accent }">preise</span>
      </div>
      <div class="text-[22px] uppercase" :style="{ fontFamily: 'IBM Plex Mono', letterSpacing: '0.12em', color: c.muted }">{{ eyebrow }}</div>
    </div>

    <div class="flex w-full flex-1 items-end justify-between">
      <div class="flex flex-col" :style="{ width: image ? '700px' : '1068px' }">
        <div
          :style="{
            color: c.ink,
            fontFamily: 'Fraunces',
            fontWeight: 800,
            fontSize: title.length > 28 ? '64px' : '84px',
            lineHeight: 0.98,
            letterSpacing: '-0.03em',
          }"
        >
          {{ title }}
        </div>
        <div v-if="price || perKg" class="mt-8 flex items-baseline">
          <span v-if="price" class="mr-6 text-[64px] leading-none" :style="{ fontFamily: 'IBM Plex Mono', fontWeight: 600, color: c.ink }">{{ price }}</span>
          <span v-if="perKg" class="text-[34px] leading-none" :style="{ fontFamily: 'IBM Plex Mono', fontWeight: 500, color: c.accent }">{{ perKg }}</span>
        </div>
        <div v-if="note" class="mt-6 text-[28px]" :style="{ color: c.muted }">{{ note }}</div>
      </div>
      <div v-if="image" class="flex h-[320px] w-[320px] items-center justify-center rounded-3xl p-6" :style="{ backgroundColor: c.photo }">
        <img :src="image" width="272" height="272" style="object-fit: contain" />
      </div>
    </div>

    <div class="mt-10 flex h-3 w-full rounded-full" :style="{ backgroundColor: c.accent }" />
  </div>
</template>
