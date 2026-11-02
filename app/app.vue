<script setup lang="ts">
import { ROUTES } from '#shared/routes'
import { de } from '@nuxt/ui/locale'
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const links = computed<NavigationMenuItem[]>(() => [
  { label: 'Übersicht', to: ROUTES.home, active: route.path === ROUTES.home },
  { label: 'Vergleich', to: ROUTES.compare },
  { label: 'Methodik', to: ROUTES.method },
])
</script>

<template>
  <UApp :locale="de">
    <UHeader :to="ROUTES.home" mode="drawer">
      <template #title>
        <span class="text-2xl leading-none tracking-tight text-highlighted" aria-label="Proteinpreise">
          <span class="display">Protein</span><span class="font-display font-normal italic text-primary">preise</span>
        </span>
      </template>

      <UNavigationMenu :items="links" variant="link" color="neutral" />

      <template #right>
        <UColorModeButton color="neutral" variant="ghost" />
      </template>

      <template #body>
        <UNavigationMenu :items="links" orientation="vertical" color="neutral" class="-mx-2.5" />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter class="mt-24 border-t border-default">
      <template #left>
        <p class="max-w-prose text-sm text-muted">
          Preise aus den öffentlichen Katalogen der Shops, einmal täglich abgerufen. Ohne Gewähr, maßgeblich ist der
          Preis im Shop.
        </p>
      </template>
      <template #right>
        <UButton :to="ROUTES.method" variant="link" color="neutral" trailing-icon="i-lucide-arrow-right">
          Wie das funktioniert
        </UButton>
      </template>
    </UFooter>
  </UApp>
</template>
