<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()
const localePath = useLocalePath()

const contentPath = computed(() => {
  const path = route.path || ''
  return path.replace(/^\/(en|nl)(?=\/|$)/, '') || '/'
})

const { data: post } = await useAsyncData(
  () => `blog-post-${locale.value}-${contentPath.value}`,
  () => queryCollection(locale.value === 'en' ? 'posts_en' : 'posts_nl').path(contentPath.value).first()
)
if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

const { data: surround } = await useAsyncData(
  () => `blog-post-surround-${locale.value}-${contentPath.value}`,
  () => queryCollectionItemSurroundings(
    locale.value === 'en' ? 'posts_en' : 'posts_nl',
    contentPath.value,
    { fields: ['description'] }
  )
)

const surroundLocalized = computed(() => surround.value?.filter(s => s && s.path).map(s => ({ ...s, path: localePath(s.path) })).filter((s): s is typeof s & { path: string } => !!s.path))

const title = post.value.seo?.title || post.value.title
const description = post.value.seo?.description || post.value.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

if (post.value.image?.src) {
  defineOgImage({
    url: post.value.image.src
  })
} else {
  defineOgImageComponent('Saas', {
    headline: 'Blog'
  })
}
</script>

<template>
  <div>
    <UContainer v-if="post">
      <UPageHeader :title="post?.title" :description="post?.description">
        <template #headline>
          <UBadge v-if="post?.badge" v-bind="post?.badge" variant="subtle" />
          <span class="text-muted">&middot;</span>
          <time class="text-muted">{{ new Date(post?.date).toLocaleDateString('en', {
            year: 'numeric', month: 'short',
            day: 'numeric' }) }}</time>
        </template>

        <div class="flex flex-wrap items-center gap-3 mt-4">
          <UButton v-for="(author, index) in post.authors" :key="index" :to="author.to || '#'" color="neutral" variant="subtle"
            target="_blank" size="sm">
            <UAvatar v-if="author.avatar" v-bind="author.avatar" alt="Author avatar" size="2xs" />

            {{ author.name }}
          </UButton>
        </div>
      </UPageHeader>

      <UPage>
        <UPageBody>
          <ContentRenderer v-if="post" :value="post" />

          <USeparator v-if="surround?.length" />

          <UContentSurround :surround="surroundLocalized" />
        </UPageBody>

        <template v-if="post?.body?.toc?.links?.length" #right>
          <UContentToc :links="post.body.toc.links" />
        </template>
      </UPage>
    </UContainer>
  </div>
</template>
