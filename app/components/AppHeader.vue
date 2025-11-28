<script setup lang="ts">
import { en, nl } from '@nuxt/ui/locale'
import { authClient } from '~/utils/auth-client'
import type { DropdownMenuItem } from '@nuxt/ui'

const route = useRoute()
const { t, locale, setLocale } = useI18n()
const toast = useToast()

// User store
const userStore = useUserStore()
const { currentUser, userInitials, isAuthenticated, currentSession, myOrganizations, activeOrganization, loadingOrganization } = storeToRefs(userStore)

// Reactive states for menu items
const isOrgAdmin = ref(false)
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

  // Add service request menu items if layer is present
  if (serviceRequestMenu?.menuItems) {
    const serviceRequestItems = serviceRequestMenu.menuItems.value.map(item => ({
      label: item.label,
      to: item.to,
      active: isRouteActive(item.to),
      icon: item.icon
    }))
    privateItems.push(...serviceRequestItems)
  }

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
let serviceRequestMenu: ReturnType<typeof useServiceRequestMenu> | null = null
try {
  if (typeof useServiceRequestMenu !== 'undefined') {
    serviceRequestMenu = useServiceRequestMenu()
  }
} catch {
  // Service request layer not available
  serviceRequestMenu = null
}

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

</script>

<template>
  <!-- Impersonation Banner -->
  <div v-if="isImpersonating" class="sticky top-0 z-50">
    <UAlert
      color="warning"
      variant="soft"
      orientation="horizontal"
      :title="t('admin.userManagement.impersonate.indicator')"
      :ui="{
        root: 'rounded-none py-2 px-4',
        wrapper: 'flex-1',
        title: 'text-sm font-medium',
        actions: 'ml-auto'
      }"
    >
      <template #actions>
        <UButton
          color="warning"
          variant="solid"
          size="sm"
          @click="stopImpersonating"
        >
          {{ t('admin.userManagement.impersonate.stop') }}
        </UButton>
      </template>
    </UAlert>
  </div>

  <UHeader>
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
          <button
            v-if="isAuthenticated && activeOrganization && hasMultipleOrganizations"
            type="button"
            class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1 text-left hover:text-highlighted transition-colors"
            @click="showOrgSwitcherModal = true"
          >
            {{ activeOrganization.name }}
          </button>
          <span
            v-else-if="isAuthenticated && activeOrganization"
            class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1"
          >
            {{ activeOrganization.name }}
          </span>
          <span
            v-else-if="isAuthenticated && loadingOrganization"
            class="text-sm text-gray-400 leading-tight -mt-1 flex items-center gap-1"
          >
            <UIcon name="i-lucide-loader-2" class="w-3 h-3 animate-spin" />
            Loading...
          </span>
          <span v-else class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1">
            Facility Services
          </span>
        </div>
      </div>
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
      <div class="hidden lg:flex items-center gap-3">
        <ULocaleSelect v-model="currentLocale" :locales="[en, nl]" />
        <UColorModeButton />

        <!-- User Avatar Dropdown (only show when user is logged in) -->
        <UDropdownMenu v-if="currentUser" :items="userMenuItems" :ui="{ content: 'w-48' }">
          <UAvatar :src="currentUser.image ?? undefined" :alt="currentUser.name || currentUser.email || 'User'" :text="userInitials"
            size="sm" class="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" />
        </UDropdownMenu>
      </div>

      <!-- Organization Switcher Modal -->
      <UModal v-model:open="showOrgSwitcherModal" title="Switch Organization" :ui="{ footer: 'justify-end' }">
        <template #body>
          <OrganizationSwitcher v-if="isAuthenticated" :show-create-button="false" @switched="showOrgSwitcherModal = false" />
        </template>
        <template #footer="{ close }">
          <UButton label="Close" color="neutral" variant="outline" @click="close" />
        </template>
      </UModal>
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

      <!-- Active Organization Display for Mobile -->
      <div v-if="isAuthenticated && (activeOrganization || loadingOrganization)" class="mb-4">
        <UButton
          v-if="loadingOrganization"
          variant="ghost"
          size="sm"
          disabled
          block
          class="text-muted"
        >
          <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        </UButton>
        <UButton
          v-else-if="activeOrganization"
          variant="ghost"
          size="sm"
          icon="i-lucide-building-2"
          block
          class="text-muted hover:text-highlighted"
          @click="showOrgSwitcherModal = true"
        >
          {{ activeOrganization.name }}
        </UButton>
      </div>

      <!-- User Avatar Dropdown for Mobile (only show when user is logged in) -->
      <div v-if="currentUser" class="mb-6">
        <UDropdownMenu :items="userMenuItems" :ui="{ content: 'w-48' }">
          <UAvatar :src="currentUser.image ?? undefined" :alt="currentUser.name || currentUser.email || 'User'" :text="userInitials"
            size="md" class="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" />
        </UDropdownMenu>
      </div>

      <UFormField :label="t('nav.language')" name="language">
        <ULocaleSelect v-model="currentLocale" :locales="[en, nl]" class="w-48" />
      </UFormField>
    </template>
  </UHeader>
</template>
