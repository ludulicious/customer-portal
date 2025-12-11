<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()

const links = [[{
  label: t('settings.profile'),
  icon: 'i-lucide-user',
  to: '/settings',
  exact: true
}, {
  label: t('settings.organization'),
  icon: 'i-lucide-users',
  to: '/settings/organization'
}, {
  label: t('settings.notifications'),
  icon: 'i-lucide-bell',
  to: '/settings/notifications'
}, {
  label: t('settings.security'),
  icon: 'i-lucide-shield',
  to: '/settings/security'
}]] satisfies NavigationMenuItem[][]
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <UNavigationMenu :items="links" highlight class="mb-4" />
      <NuxtPage />
    </UContainer>
  </div>
</template>
