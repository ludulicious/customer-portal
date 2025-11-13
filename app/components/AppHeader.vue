<script setup lang="ts">
import { en, nl } from '@nuxt/ui/locale'
import { authClient } from '~/utils/auth-client'
import type { DropdownMenuItem } from '@nuxt/ui'

const route = useRoute()
const { t, locale, setLocale } = useI18n()

// User store
const userStore = useUserStore()
const { currentUser, userInitials, isAuthenticated } = storeToRefs(userStore)

// Reactive states for menu items
const isOrgAdmin = ref(false)

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
        label: 'Profile',
        icon: 'i-lucide-user',
        to: '/profile'
      }
    ]
  ] as DropdownMenuItem[]

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
      label: 'Logout',
      icon: 'i-lucide-log-out',
      onSelect: async () => {
        await authClient.signOut()
        await navigateTo('/')
      }
    }
  ])

  return menuItems
})

// Function to check if a route is active
const isRouteActive = (itemPath: string) => {
  const currentPath = route.path

  // Exact match for root paths
  if (itemPath === '/' && currentPath === '/') return true

  // For other paths, check if current path starts with the item path
  // This handles sub-pages like /blog/[slug] matching /blog
  if (itemPath !== '/' && currentPath.startsWith(itemPath)) return true

  return false
}

// Define static navigation items with active state
const items = computed(() => {
  const publicItems = [{
    label: t('nav.blog'),
    to: '/blog',
    active: isRouteActive('/blog')
  }, {
    label: t('nav.contact'),
    to: '/contact',
    active: isRouteActive('/contact')
  }]

  if (!isAuthenticated.value) {
    console.log('Public items:', publicItems)
    return publicItems
  }

  const privateItems = [{
    label: t('nav.dashboard'),
    to: '/dashboard',
    active: isRouteActive('/dashboard')
  }]

  // Add organization management items for admins/owners
  if (isOrgAdmin.value) {
    privateItems.push({
      label: t('nav.organization'),
      to: '/organization',
      active: isRouteActive('/organization')
    })
  }

  // Add admin menu items for system admins
  if (userStore.isAdmin) {
    privateItems.push({
      label: t('nav.admin'),
      to: '/admin',
      active: isRouteActive('/admin')
    })
  }

  return [...privateItems, ...publicItems]
})

// Try to use service request menu composable (will be undefined if layer not present)
// const serviceRequestMenu = useServiceRequestMenu?.() || null

// Use static items to avoid hydration mismatch
// const items = computed(() => {
//   const baseItemsList = baseItems.value
// Add service request menu items if layer is present
// if (serviceRequestMenu?.menuItems) {
//   const serviceRequestItems = serviceRequestMenu.menuItems.value.map(item => ({
//     label: item.label,
//     to: item.to,
//     active: isRouteActive(item.to),
//     icon: item.icon
//   }))

//   // Insert service request items after dashboard
//   const dashboardIndex = baseItemsList.findIndex(item => item.to.includes('/dashboard'))
//   if (dashboardIndex !== -1) {
//     baseItemsList.splice(dashboardIndex + 1, 0, ...serviceRequestItems)
//   } else {
//     baseItemsList.unshift(...serviceRequestItems)
//   }
// }

// return baseItemsList
// })

// Create a reactive locale ref that's properly initialized
const currentLocale = ref(locale.value)

// Watch for locale changes and handle them properly
watch(locale, (newLocale) => {
  currentLocale.value = newLocale
  setLocale(newLocale)
  console.log('Locale changed to:', newLocale)
  // No URL change needed with no_prefix strategy
}, { immediate: false })

// Watch currentLocale changes to update the global locale
watch(currentLocale, (newLocale) => {
  setLocale(newLocale)
  // No URL change needed with no_prefix strategy
})

</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/">
        <AppLogo class="w-auto h-6 shrink-0" />
      </NuxtLink>
    </template>

    <nav class="hidden lg:flex items-center gap-6">
      <NuxtLink v-for="item in items" :key="item.to" :to="item.to" :class="[
        'text-sm font-medium transition-colors',
        item.active
          ? 'text-primary font-semibold'
          : 'text-muted hover:text-highlighted'
      ]">
        {{ item.label }}
      </NuxtLink>
    </nav>

    <template #right>
      <ULocaleSelect v-model="currentLocale" class="hidden lg:flex" :locales="[en, nl]" />
      <UColorModeButton />

      <!-- User Avatar Dropdown (only show when user is logged in) -->
      <UDropdownMenu v-if="currentUser" :items="userMenuItems" :ui="{ content: 'w-48' }">
        <UAvatar :src="currentUser.image" :alt="currentUser.name || currentUser.email || 'User'" :text="userInitials"
          size="sm" class="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" />
      </UDropdownMenu>
    </template>

    <template #body>
      <nav class="flex flex-col gap-4 -mx-2.5">
        <NuxtLink v-for="item in items" :key="item.to" :to="item.to" :class="[
          'text-sm font-medium transition-colors px-2.5 py-1.5 rounded-md',
          item.active
            ? 'text-primary font-semibold bg-primary/10'
            : 'text-muted hover:text-highlighted hover:bg-gray-100 dark:hover:bg-gray-800'
        ]">
          {{ item.label }}
        </NuxtLink>
      </nav>

      <USeparator class="my-6" />

      <!-- User Avatar Dropdown for Mobile (only show when user is logged in) -->
      <div v-if="currentUser" class="mb-6">
        <UDropdownMenu :items="userMenuItems" :ui="{ content: 'w-48' }">
          <UAvatar :src="currentUser.image" :alt="currentUser.name || currentUser.email || 'User'" :text="userInitials"
            size="md" class="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" />
        </UDropdownMenu>
      </div>

      <UFormField :label="t('nav.language')" name="language">
        <ULocaleSelect v-model="currentLocale" :locales="[en, nl]" class="w-48" />
      </UFormField>
    </template>
  </UHeader>
</template>
