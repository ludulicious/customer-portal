<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()
const { t } = useI18n()
const open = ref(false)

const links = [[{
  label: t('menu.dashboard'),
  icon: 'i-lucide-layout-dashboard',
  to: '/dashboard',
  onSelect: () => {
    open.value = false
  },
  badge: '4',
},
{
  label: t('menu.inbox'),
  icon: 'i-lucide-inbox',
  to: '/inbox',
  badge: '4',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('menu.serviceRequests.title'),
  icon: 'i-lucide-ticket',
  to: '/requests',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('menu.settings.title'),
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: false,
  type: 'trigger',
  children: [{
    label: t('menu.settings.general'),
    to: '/settings',
    exact: true,
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('menu.settings.organization'),
    to: '/settings/organization',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('menu.settings.notifications'),
    to: '/settings/notifications',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('menu.settings.security'),
    to: '/settings/security',
    onSelect: () => {
      open.value = false
    }
  }]
}], [{
  label: t('menu.feedback'),
  icon: 'i-lucide-message-circle',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}, {
  label: t('menu.helpSupport'),
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}]] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.flat()
}, {
  id: 'code',
  label: 'Code',
  items: [{
    id: 'source',
    label: 'View page source',
    icon: 'i-simple-icons-github',
    to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Accept',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Opt out',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
})
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Orange bar - only visible on large screens -->
    <div class="hidden lg:block h-8 bg-orange-500 fixed top-0 left-0 right-0 z-50" />
    <UDashboardGroup unit="rem" class="lg:p-8">
      <UDashboardSidebar id="default" v-model:open="open" collapsible resizable class="bg-elevated/25 lg:pb-12"
        :ui="{ footer: 'lg:border-t lg:border-default' }">
        <template #header="{ collapsed }">
          <TeamsMenu :collapsed="collapsed" />
        </template>
        <template #default="{ collapsed }">
          <TeamsMenu :collapsed="collapsed" class="lg:hidden" />
          <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />
          <UNavigationMenu :collapsed="collapsed" :items="links[0]" orientation="vertical" tooltip popover />
          <UNavigationMenu :collapsed="collapsed" :items="links[1]" orientation="vertical" tooltip class="mt-auto" />
        </template>

        <template #footer="{ collapsed }">
          <UserMenu :collapsed="collapsed" />
        </template>
      </UDashboardSidebar>

      <UDashboardSearch :groups="groups" />
        <slot />
      <NotificationsSlideover />
    </UDashboardGroup>
  </div>
</template>
