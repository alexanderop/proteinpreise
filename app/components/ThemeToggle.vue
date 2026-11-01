<script setup lang="ts">
type Theme = 'light' | 'dark'

const theme = ref<Theme | null>(null)

onMounted(() => {
  const set = document.documentElement.dataset.theme
  theme.value =
    set === 'light' || set === 'dark' ? set : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
})

function toggle() {
  const next: Theme = theme.value === 'dark' ? 'light' : 'dark'
  theme.value = next
  document.documentElement.dataset.theme = next
  try {
    localStorage.setItem('theme', next)
  } catch {}
}
</script>

<template>
  <button
    type="button"
    class="toggle"
    :aria-label="theme === 'dark' ? 'Helles Design' : 'Dunkles Design'"
    :title="theme === 'dark' ? 'Helles Design' : 'Dunkles Design'"
    @click="toggle"
  >
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.6" />
      <path d="M10 3 A7 7 0 0 1 10 17 Z" fill="currentColor" />
    </svg>
  </button>
</template>

<style scoped>
.toggle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--rule);
  border-radius: 50%;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}

.toggle:hover {
  border-color: var(--ink);
}
</style>
