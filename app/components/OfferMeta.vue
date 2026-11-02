<script setup lang="ts">
import type { OfferRow } from '#shared/prices'
import { CATEGORY_LABEL } from '#shared/types'
import { shopBrand } from '#shared/brands'

defineProps<{ row: OfferRow }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted">
    <span v-if="row.brand !== shopBrand(row.shopId)" class="font-medium text-toned after:ml-1.5 after:content-['·']">{{ row.brand }}</span>
    <span>{{ CATEGORY_LABEL[row.category] }}</span>
    <span v-if="row.flavors > 1" class="before:mr-1.5 before:content-['·']">{{ row.flavors }} Sorten</span>
    <UBadge v-if="row.reduced" size="sm" class="bg-marker text-marker-text">Reduziert</UBadge>
    <UBadge v-if="row.isNew" size="sm" color="neutral">Neu</UBadge>
  </div>
</template>
