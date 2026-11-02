<script setup lang="ts">
import { SHOPS } from '#shared/shops'

const shops = SHOPS.map((s) => ({ id: s.id, name: s.name, domain: s.domain, href: `https://${s.domain}` }))
</script>

<template>
  <ul class="not-prose my-6 grid list-none grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3 p-0">
    <li v-for="item in shops" :key="item.id" class="m-0 rounded-lg bg-surface p-4 shadow-card ring ring-default">
      <a :href="item.href" target="_blank" rel="noopener" class="font-semibold text-highlighted hover:text-primary">
        {{ item.name }}
      </a>
      <span class="num block text-xs text-muted">{{ item.domain }}</span>
    </li>
  </ul>
</template>
