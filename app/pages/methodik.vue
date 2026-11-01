<script setup lang="ts">
const { data: page } = await useAsyncData('page:methodik', () => queryCollection('pages').path('/methodik').first())

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Seite nicht gefunden', fatal: true })
}

useSeoMeta({
  title: () => `${page.value!.title} | Proteinpreise`,
  description: () => page.value!.description,
})
</script>

<template>
  <div class="wrap">
    <article class="prose">
      <p class="kicker">Methodik</p>
      <ContentRenderer v-if="page" :value="page" />
    </article>
  </div>
</template>

<style scoped>
.prose {
  max-width: 68ch;
  padding: clamp(32px, 6vw, 72px) 0 0;
  font-size: 17px;
  line-height: 1.65;
}

.prose :deep(h1) {
  margin: 10px 0 28px;
  font-family: var(--font-display);
  font-weight: 800;
  font-variation-settings: 'opsz' 144;
  font-size: clamp(40px, 7vw, 72px);
  line-height: 0.98;
  letter-spacing: -0.03em;
}

.prose :deep(h2) {
  margin: 48px 0 12px;
  padding-top: 10px;
  border-top: 3px solid var(--rule-strong);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.02em;
}

.prose :deep(h2 a),
.prose :deep(h1 a) {
  text-decoration: none;
}

.prose :deep(p),
.prose :deep(li) {
  color: var(--ink);
}

.prose :deep(li + li) {
  margin-top: 8px;
}

.prose :deep(code) {
  font-family: var(--font-num);
  font-size: 0.9em;
  padding: 1px 5px;
  background: var(--paper-2);
}

.prose :deep(strong) {
  font-weight: 600;
}

.prose :deep(.shop-list) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  padding: 0 1px 1px 0;
  list-style: none;
}

.prose :deep(.shop-list li) {
  display: grid;
  margin: 0 -1px -1px 0;
  padding: 12px 14px;
  border: 1px solid var(--rule);
}

.prose :deep(.shop-list a) {
  font-weight: 600;
  text-decoration: none;
}

.prose :deep(.shop-list span) {
  font-family: var(--font-num);
  font-size: 12.5px;
  color: var(--ink-2);
}
</style>
