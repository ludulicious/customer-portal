<template>
  <div>
    <UBlogPost v-bind="$attrs" :image="optimizedImage">
      <template #image v-if="image?.src">
        <NuxtImg :src="image.src" :alt="image.alt || title" :width="image.width || 400" :height="image.height || 300"
        :quality="80" format="webp" loading="lazy" class="w-full h-full object-cover" preset="thumbnail" />
      </template>

      <!-- Explicitly render title for naked variant -->
      <template #title v-if="title">
        <h3 class="text-xl font-semibold text-highlighted mb-2">{{ title }}</h3>
      </template>
    </UBlogPost>
  </div>
</template>

<script setup lang="ts">
interface Props {
  image?: {
    src: string
    alt?: string
    width?: number
    height?: number
  }
  title?: string
}

const props = defineProps<Props>()

// Create optimized image object for UBlogPost
const optimizedImage = computed(() => {
  if (!props.image?.src) return undefined

  return {
    ...props.image,
    // Add any additional optimization properties here
  }
})
</script>
