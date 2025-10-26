<script setup lang="ts">

import { en, nl } from '@nuxt/ui/locale'
import { authClient } from '@@/lib/auth-client'

const localePath = useLocalePath()
const route = useRoute()
const { t, locale, setLocale } = useI18n()
const router = useRouter()
const path = computed(() => route.path)


// User store
const userStore = useUserStore()
const { currentUser, userInitials } = storeToRefs(userStore)
const { data: session } = await authClient.useSession(useFetch);
// Dropdown menu items for user avatar
const userMenuItems = computed(() => [
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
      to: localePath('/profile')
    }
  ],
  [
    {
      label: 'Logout',
      icon: 'i-lucide-log-out',
      onSelect: async () => {
        await authClient.signOut()
        await navigateTo(localePath('/'))
      }
    }
  ]
])

// Logout function
const handleLogout = async () => {
  await userStore.clearUserData()
  await navigateTo(localePath('/'))
}

// Define static navigation items without active state to avoid hydration mismatch
const baseItems = computed(() => [{
  label: t('nav.blog'),
  to: localePath('/blog')
}, {
  label: t('nav.contact'),
  to: localePath('/contact')
}])

// Use static items to avoid hydration mismatch
const items = computed(() => baseItems.value)

// Create a reactive locale ref that's properly initialized
const currentLocale = ref(locale.value)

// Watch for locale changes and handle them properly
watch(locale, (newLocale) => {
  currentLocale.value = newLocale
  setLocale(newLocale)
  console.log('Locale changed to:', newLocale)
  router.push(localePath(path.value))
}, { immediate: false })

// Watch currentLocale changes to update the global locale
watch(currentLocale, (newLocale) => {
  setLocale(newLocale)
  router.push(localePath(path.value))
})

</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink :to="localePath('/')">
        <AppLogo class="w-auto h-6 shrink-0" />
      </NuxtLink>
    </template>

    <nav class="hidden lg:flex items-center gap-6">
      <NuxtLink v-for="item in items" :key="item.to" :to="item.to"
        class="text-sm font-medium text-muted hover:text-highlighted transition-colors">
        {{ item.label }}
      </NuxtLink>

    </nav>

    <template #right>
      <ULocaleSelect class="hidden lg:flex" v-model="currentLocale" :locales="[en, nl]" />
      <UColorModeButton />

      <!-- User Avatar Dropdown (only show when user is logged in) -->
      <UDropdownMenu v-if="currentUser" :items="userMenuItems" :ui="{ content: 'w-48' }">
        <UAvatar
          :src="currentUser.image"
          :alt="currentUser.name || currentUser.email || 'User'"
          :text="userInitials"
          size="sm"
          class="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
        />
      </UDropdownMenu>
    </template>

    <template #body>
      <nav class="flex flex-col gap-4 -mx-2.5">
        <NuxtLink v-for="item in items" :key="item.to" :to="item.to"
          class="text-sm font-medium text-muted hover:text-highlighted transition-colors px-2.5 py-1.5 rounded-md">
          {{ item.label }}
        </NuxtLink>
      </nav>

      <USeparator class="my-6" />

      <!-- User Avatar Dropdown for Mobile (only show when user is logged in) -->
      <div v-if="currentUser" class="mb-6">
        <UDropdownMenu :items="userMenuItems" :ui="{ content: 'w-48' }">
          <UAvatar
            :src="currentUser.image"
            :alt="currentUser.name || currentUser.email || 'User'"
            :text="userInitials"
            size="md"
            class="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
          />
        </UDropdownMenu>
      </div>

      <UFormField :label="t('nav.language')" name="language">
        <ULocaleSelect v-model="currentLocale" :locales="[en, nl]" class="w-48" />
      </UFormField>

    </template>
  </UHeader>
</template>
