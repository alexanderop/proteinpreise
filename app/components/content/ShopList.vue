<script setup lang="ts">
import { SHOPS } from '#shared/shops'
</script>

<template>
  <ul class="shop-list">
    <li v-for="shop in SHOPS" :key="shop.id">
      <a :href="`https://${shop.domain}`" rel="noopener" target="_blank">{{ shop.name }}</a>
      <span>{{ shop.domain }}</span>
    </li>
  </ul>
</template>
