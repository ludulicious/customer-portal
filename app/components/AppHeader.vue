<script setup lang="ts">
const route = useRoute()
const { t, locale, setLocale } = useI18n()
import { en, nl } from '@nuxt/ui/locale'
const localePath = useLocalePath()
const router = useRouter()
const path = computed(() => route.path)

// Define static navigation items without active state to avoid hydration mismatch
const baseItems = computed(() => [{
  label: t('nav.portfolio'),
  to: localePath('/portfolio')
}, {
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
    </template>

    <template #body>
      <nav class="flex flex-col gap-4 -mx-2.5">
        <NuxtLink v-for="item in items" :key="item.to" :to="item.to"
          class="text-sm font-medium text-muted hover:text-highlighted transition-colors px-2.5 py-1.5 rounded-md">
          {{ item.label }}
        </NuxtLink>
      </nav>

      <USeparator class="my-6" />
      <UFormField :label="t('nav.language')" name="language">
        <ULocaleSelect v-model="currentLocale" :locales="[en, nl]" class="w-48" />
      </UFormField>

    </template>
  </UHeader>
</template>
