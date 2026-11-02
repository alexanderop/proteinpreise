<script setup lang="ts">
const props = withDefaults(defineProps<{ src?: string | null; alt: string; width?: number; eager?: boolean }>(), {
  src: null,
  width: 160,
  eager: false,
})

const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)

// Shopify's CDN resizes on request; other hosts ignore the parameter.
const sized = computed(() => {
  if (!props.src) return null
  if (!props.src.includes('cdn.shopify.com') && !props.src.includes('/cdn/shop/')) return props.src
  const url = new URL(props.src)
  url.searchParams.set('width', String(props.width * 2))
  return url.toString()
})
</script>

<template>
  <div class="relative grid shrink-0 place-items-center overflow-hidden rounded-lg bg-photo ring ring-default">
    <img
      v-if="sized && !failed"
      :src="sized"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      referrerpolicy="no-referrer"
      class="size-full object-contain p-[8%]"
      @error="failed = true"
    />
    <UIcon v-else name="i-lucide-package" class="size-2/5 text-dimmed" aria-hidden="true" />
  </div>
</template>
