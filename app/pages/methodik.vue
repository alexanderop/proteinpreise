<script setup lang="ts">
// oxlint-disable-next-line proteinpreise/no-raw-route -- a content collection path, not a link
const { data: page } = await useAsyncData('page:methodik', () => queryCollection('pages').path('/methodik').first())

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Seite nicht gefunden', fatal: true })
}

useSeoMeta({
  title: () => page.value!.title,
  description: () => page.value!.description,
})

defineOgImage('Proteinpreise', { eyebrow: 'Methodik', title: page.value.title, note: page.value.description })
</script>

<template>
  <UContainer>
    <article class="methodik max-w-[68ch] pt-12 sm:pt-20">
      <p class="eyebrow">Methodik</p>
      <ContentRenderer v-if="page" :value="page" />
    </article>
  </UContainer>
</template>

<style scoped>
@reference '~/assets/css/main.css';

.methodik :deep(h1) {
  @apply display mt-3 mb-8 text-title text-highlighted;
}

.methodik :deep(h2) {
  @apply display mt-14 mb-3 border-t border-default pt-4 text-headline text-highlighted;
}

.methodik :deep(h1 a),
.methodik :deep(h2 a) {
  @apply no-underline;
}
</style>
