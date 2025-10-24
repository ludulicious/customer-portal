<script setup lang="ts">

const colorMode = useColorMode()

// Dynamic theme color based on current mode
const color = computed(() => {
  if (colorMode.value === 'dark') {
    return '#0a0f1a' // Deep space background
  }
  return '#fafbff' // Cosmic dawn background
})

// Enhanced meta tags for cosmic theme
useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color },
    { name: 'color-scheme', content: 'light dark' },
    { name: 'msapplication-TileColor', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }
  ],
  htmlAttrs: {
    lang: 'en',
    class: computed(() => colorMode.value)
  }
})

useSeoMeta({
  titleTemplate: '%s - Ludulicious',
  ogImage: 'https://ludu.odmdata.com/images/ogimage.png',
  twitterImage: 'https://ludu.odmdata.com/images/ogimage.png',
  twitterCard: 'summary_large_image'
})

// Simplified navigation - no content queries to avoid server errors
const navigation = ref([])
const files = ref([])

const links = [{
  label: 'Portfolio',
  icon: 'i-lucide-briefcase',
  to: '/portfolio'
}, {
  label: 'Blog',
  icon: 'i-lucide-pencil',
  to: '/blog'
}, {
  label: 'Theme Demo',
  icon: 'i-lucide-palette',
  to: '/theme-demo'
}, {
  label: 'UI Demo',
  icon: 'i-lucide-layout',
  to: '/nuxt-ui-demo'
}]

provide('navigation', navigation)


</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage :transition="{
        name: 'main-fade',
        mode: 'out-in'
      }" />
    </NuxtLayout>

    <!-- Content search disabled to prevent server errors -->
    <!-- <ClientOnly>
      <LazyUContentSearch
        :files="files"
        shortcut="meta_k"
        :navigation="navigation"
        :links="links"
        :fuse="{ resultLimit: 42 }"
      />
    </ClientOnly> -->
  </UApp>
</template>
