<script setup lang="ts">
import type { ProjectsEnCollectionItem } from '@nuxt/content';

const route = useRoute()
const { locale } = useI18n()
const localePath = useLocalePath()

const { data: page } = await useAsyncData(
  () => `portfolio-${locale.value}`,
  () => queryCollection(locale.value === 'en' ? 'portfolio_en' : 'portfolio_nl').first()
)
const { data: projects } = await useAsyncData(
  () => `portfolio-projects-${locale.value}-${route.path}`,
  () => queryCollection(locale.value === 'en' ? 'projects_en' : 'projects_nl').all()
)


const shuffle = (values: any[]) => {
  let index = values.length,  randomIndex

  // While there remain elements to shuffle.
  while (index != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * index)
    index--

    // And swap it with the current element.
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]]
  }

  return values
}

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

defineOgImageComponent('Saas')
</script>

<template>
  <div>
    <UContainer>
      <UPageHeader v-bind="page" class="py-[50px]" />

      <UPageBody>
        <UBlogPosts>
          <UBlogPost v-for="(project, index) in projects" :key="index" :to="localePath(project.path)"
            :title="project.title || 'Untitled Project'" :description="project.description" :image="project.image"
            :badge="project.badge" :orientation="index === 0 ? 'horizontal' : 'vertical'"
            :class="[index === 0 && 'col-span-full']" variant="naked" :ui="{
              description: 'line-clamp-2',
              title: 'text-2xl font-bold text-highlighted mb-2'
            }" />
        </UBlogPosts>
      </UPageBody>
    </UContainer>
  </div>
</template>
