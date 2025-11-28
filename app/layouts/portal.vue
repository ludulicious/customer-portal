<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import { en, nl } from '@nuxt/ui/locale'
import { authClient } from '~/utils/auth-client'

const route = useRoute()
const toast = useToast()
const { t, locale, setLocale } = useI18n()
const open = ref(false)

const userStore = useUserStore()
const { currentUser, userInitials, isAuthenticated, currentSession, myOrganizations, activeOrganization, loadingOrganization, activeOrganizationRole } = storeToRefs(userStore)

// Reactive states for menu items
const isOrgAdmin = computed(() => {
  return activeOrganizationRole.value === 'admin' || activeOrganizationRole.value === 'owner'
})
const showOrgSwitcherModal = ref(false)

const hasMultipleOrganizations = computed(() => {
  return myOrganizations.value && myOrganizations.value.length > 1
})

// Dropdown menu items for user avatar
const userMenuItems = computed(() => {
  const menuItems = [
    [
      {
        label: currentUser.value?.name || currentUser.value?.email || 'User',
        avatar: {
          src: currentUser.value?.image,
          alt: currentUser.value?.name || currentUser.value?.email || 'User'
        },
        type: 'label' as const
      }
    ],
    [
      {
        label: t('nav.profile'),
        icon: 'i-lucide-user',
        to: '/profile'
      },
      ...(hasMultipleOrganizations.value && isOrgAdmin.value
        ? [{
          label: t('myOrganizations.title'),
          icon: 'i-lucide-building-2',
          to: '/my-organizations'
        }]
        : []),
      ...(activeOrganization.value
        ? [{
          label: t('nav.myOrganization'),
          icon: 'i-lucide-building-2',
          to: `/admin/organizations/${activeOrganization.value.slug}`
        }]
        : [])
    ]
  ] as DropdownMenuItem[][]

  // Add organization menu items for admins/owners
  if (isOrgAdmin.value && menuItems[1]) {
    menuItems[1].push({
      label: 'Create Organization',
      icon: 'i-lucide-plus-circle',
      to: '/organizations/create'
    }, {
      label: 'Invite User',
      icon: 'i-lucide-user-plus',
      onSelect: () => {
        // Navigate to organization page with invite modal
        navigateTo('/organization?invite=true')
      }
    })
  }

  menuItems.push([
    {
      label: t('menu.logout'),
      icon: 'i-lucide-log-out',
      onSelect: async () => {
        await authClient.signOut()
        // Explicitly clear user data to ensure immediate state update
        userStore.clearUserData()
        await navigateTo('/')
      }
    }
  ])

  return menuItems
})

// Create a reactive locale ref that's properly initialized
const currentLocale = ref(locale.value)

// Watch for locale changes and handle them properly
watch(locale, (newLocale) => {
  currentLocale.value = newLocale
  setLocale(newLocale)
}, { immediate: false })

// Watch currentLocale changes to update the global locale
watch(currentLocale, (newLocale) => {
  setLocale(newLocale)
})

// Impersonation state
const isImpersonating = computed(() => !!currentSession.value?.impersonatedBy)

// Stop impersonating function
const stopImpersonating = async () => {
  try {
    await authClient.admin.stopImpersonating()
    toast.add({
      title: t('common.success'),
      description: t('admin.userManagement.impersonate.stopSuccess'),
      color: 'success'
    })
    // Reload dashboard page
    window.location.href = '/dashboard'
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.userManagement.impersonate.stopError')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  }
}

const links = [[{
  label: t('menu.home'),
  icon: 'i-lucide-house',
  to: '/',
  onSelect: () => {
    open.value = false
  }
},
{
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
  defaultOpen: true,
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
  <div class="flex flex-col h-screen w-full overflow-hidden">
    <!-- Impersonation Banner -->
    <div v-if="isImpersonating" class="sticky top-0 z-50">
      <UAlert color="warning" variant="soft" orientation="horizontal"
        :title="t('admin.userManagement.impersonate.indicator')" :ui="{
          root: 'rounded-none py-2 px-4',
          wrapper: 'flex-1',
          title: 'text-sm font-medium',
          actions: 'ml-auto'
        }">
        <template #actions>
          <UButton color="warning" variant="solid" size="sm" @click="stopImpersonating">
            {{ t('admin.userManagement.impersonate.stop') }}
          </UButton>
        </template>
      </UAlert>
    </div>

    <UHeader :ui="{ root: 'relative z-[45]', container: 'max-w-full px-4 sm:px-6 lg:px-8' }">
      <template #left>
        <div class="flex items-center gap-3">
          <!-- Logo Icon -->
          <NuxtLink to="/" class="shrink-0">
            <div class="relative">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Background circle -->
                <circle cx="20" cy="20" r="20" fill="#75cbfe" />
                <!-- Building/facility icon -->
                <rect x="12" y="15" width="4" height="10" fill="white" rx="1" />
                <rect x="18" y="12" width="4" height="13" fill="white" rx="1" />
                <rect x="24" y="18" width="4" height="7" fill="white" rx="1" />
                <!-- Roof/peak -->
                <path d="M10 15 L20 8 L30 15 L28 15 L20 10 L12 15 Z" fill="white" />
                <!-- Door -->
                <rect x="18" y="20" width="2" height="5" fill="#75cbfe" />
              </svg>
            </div>
          </NuxtLink>

          <!-- ApexPro Title with Organization Name or Facility Services Subtitle -->
          <div class="flex flex-col">
            <span class="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              ApexPro
            </span>
            <button v-if="isAuthenticated && activeOrganization && hasMultipleOrganizations" type="button"
              class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1 text-left hover:text-highlighted transition-colors"
              @click="showOrgSwitcherModal = true">
              {{ activeOrganization.name }}
            </button>
            <span v-else-if="isAuthenticated && activeOrganization"
              class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1">
              {{ activeOrganization.name }}
            </span>
            <span v-else-if="isAuthenticated && loadingOrganization"
              class="text-sm text-gray-400 leading-tight -mt-1 flex items-center gap-1">
              <UIcon name="i-lucide-loader-2" class="w-3 h-3 animate-spin" />
              Loading...
            </span>
            <span v-else class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1">
              Facility Services
            </span>
          </div>
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-3">
          <ULocaleSelect v-model="currentLocale" :locales="[en, nl]" />
          <UColorModeButton />

          <!-- User Avatar Dropdown (only show when user is logged in) -->
          <UDropdownMenu v-if="currentUser" :items="userMenuItems" :ui="{ content: 'w-48' }">
            <UAvatar :src="currentUser.image ?? undefined" :alt="currentUser.name || currentUser.email || 'User'"
              :text="userInitials" size="sm" class="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" />
          </UDropdownMenu>
        </div>

        <!-- Organization Switcher Modal -->
        <UModal v-model:open="showOrgSwitcherModal" title="Switch Organization" :ui="{ footer: 'justify-end' }">
          <template #body>
            <OrganizationSwitcher v-if="isAuthenticated" :show-create-button="false"
              @switched="showOrgSwitcherModal = false" />
          </template>
          <template #footer="{ close }">
            <UButton label="Close" color="neutral" variant="outline" @click="close" />
          </template>
        </UModal>
      </template>
    </UHeader>

    <UDashboardGroup unit="rem" class="flex-1 overflow-hidden">
      <UDashboardSidebar id="default" v-model:open="open" collapsible resizable class="bg-elevated/25 h-full"
        :ui="{ footer: 'lg:border-t lg:border-default' }">
        <template #default="{ collapsed }">
          <div class="h-2" />
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
