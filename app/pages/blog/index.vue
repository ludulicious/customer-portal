<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()
const localePath = useLocalePath()

const { data: page } = await useAsyncData(
  () => `blog-${locale.value}`,
  () => queryCollection(locale.value === 'en' ? 'blog_en' : 'blog_nl').first()
)
const { data: posts } = await useAsyncData(
  () => `blog-posts-${locale.value}-${route.path}`,
  () => queryCollection(locale.value === 'en' ? 'posts_en' : 'posts_nl').all()
)

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
      <UPageHeader
        v-bind="page"
        class="py-[50px]"
      />

      <UPageBody>
        <UBlogPosts>
          <UBlogPost
            v-for="(post, index) in posts"
            :key="index"
            :to="localePath(post.path)"
            :title="post.title"
            :description="post.description"
            :image="post.image"
            :date="new Date(post.date)"
            :authors="post.authors"
            :badge="post.badge"
            :orientation="index === 0 ? 'horizontal' : 'vertical'"
            :class="[index === 0 && 'col-span-full']"
            variant="naked"
            :ui="{
              description: 'line-clamp-2'
            }"
          />
        </UBlogPosts>
      </UPageBody>
    </UContainer>
  </div>
</template>
