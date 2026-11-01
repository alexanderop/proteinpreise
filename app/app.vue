<script setup lang="ts">
useHead({
  script: [
    {
      key: 'theme',
      tagPosition: 'head',
      innerHTML:
        "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}",
    },
  ],
})
</script>

<template>
  <div class="shell">
    <header class="masthead">
      <div class="wrap masthead-row">
        <NuxtLink to="/" class="wordmark" aria-label="Proteinpreise, zur Übersicht">
          <span class="wordmark-a">Protein</span><span class="wordmark-b">preise</span>
        </NuxtLink>
        <nav class="nav">
          <NuxtLink to="/" class="nav-home">Übersicht</NuxtLink>
          <NuxtLink to="/vergleich">Vergleich</NuxtLink>
          <NuxtLink to="/methodik">Methodik</NuxtLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
    <main>
      <NuxtPage />
    </main>
    <footer class="footer">
      <div class="wrap footer-row">
        <p>
          Preise aus den öffentlichen Katalogen der Shops, einmal täglich abgerufen. Ohne Gewähr, maßgeblich ist der
          Preis im Shop.
        </p>
        <NuxtLink to="/methodik">Wie das funktioniert</NuxtLink>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

.masthead {
  border-bottom: 1px solid var(--rule);
}

.masthead-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
}

.wordmark {
  text-decoration: none;
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1;
  letter-spacing: -0.03em;
  white-space: nowrap;
}

.wordmark-a {
  font-weight: 800;
  font-variation-settings: 'opsz' 144;
}

.wordmark-b {
  font-weight: 400;
  font-style: italic;
  color: var(--accent);
}

.nav {
  display: flex;
  align-items: center;
  gap: clamp(10px, 3vw, 24px);
  font-size: 14px;
}

.nav a {
  text-decoration: none;
  color: var(--ink-2);
  padding: 4px 0;
  border-bottom: 2px solid transparent;
}

.nav a:hover {
  color: var(--ink);
}

.nav a.router-link-exact-active {
  color: var(--ink);
  border-bottom-color: var(--accent);
}

@media (max-width: 480px) {
  .nav-home {
    display: none;
  }
}

.footer {
  margin-top: 96px;
  border-top: 1px solid var(--rule);
  font-size: 13px;
  color: var(--ink-2);
}

.footer-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 20px;
  padding-bottom: 32px;
}

.footer-row p {
  margin: 0;
  max-width: 60ch;
}
</style>
