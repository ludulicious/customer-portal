<script setup lang="ts">
const route = useRoute()

// Get the slug from the route
const slug = computed(() => route.params.slug as string)

// Find the post by matching the route path with post paths
// Since blog index uses post.path directly, we need to match that format
const { data: post } = await useAsyncData(
  () => `blog-post-en-${route.path}`,
  async () => {
    // Get all posts and find the one that matches our route path
    const allPosts = await queryCollection('posts_en').all()

    // Try to find exact match first (with or without leading slash)
    const routePath = route.path
    const routePathNoSlash = routePath.replace(/^\//, '')

    let found = allPosts.find(p => {
      const postPath = p.path || ''
      // Match exact path (with or without leading slash)
      return postPath === routePath || postPath === routePathNoSlash
    })

    if (found) return found

    // If no exact match, try to find by slug (path ends with slug)
    found = allPosts.find(p => {
      const postPath = p.path || ''
      // Remove leading slash and trailing slash for comparison
      const normalizedPostPath = postPath.replace(/^\/|\/$/g, '')
      const normalizedRoutePath = routePath.replace(/^\/|\/$/g, '')

      // Check if paths match or if post path ends with the route slug
      return normalizedPostPath === normalizedRoutePath
        || normalizedPostPath.endsWith(`/${slug.value}`)
        || normalizedPostPath === slug.value
    })

    return found || null
  }
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

// For surround, manually find prev/next posts based on id (filename) ordering
// This ensures consistent ordering matching the blog index
const { data: surround } = await useAsyncData(
  () => `blog-post-surround-en-${route.path}`,
  async () => {
    if (!post.value?.path) {
      return null
    }

    // Get all posts ordered by id DESC (filename DESC, same as blog index)
    const allPosts = await queryCollection('posts_en')
      .order('id', 'DESC')
      .all()

    // Find current post index
    const currentIndex = allPosts.findIndex(p => {
      const postPath = p.path || ''
      const currentPath = post.value.path || ''
      return postPath === currentPath
        || postPath === currentPath.replace(/^\//, '')
        || currentPath.replace(/^\//, '') === postPath
    })

    if (currentIndex === -1) {
      return null
    }

    // Get previous and next posts
    const prev = currentIndex > 0 ? allPosts[currentIndex - 1] : null
    const next = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null

    return { prev, next }
  }
)

// queryCollectionItemSurroundings returns { prev, next } object, not an array
// Convert to array format expected by UContentSurround component
const surroundLocalized = computed(() => {
  if (!surround.value) return []

  const result = []
  if (surround.value.prev && surround.value.prev.path) {
    result.push({ ...surround.value.prev, path: surround.value.prev.path })
  }
  if (surround.value.next && surround.value.next.path) {
    result.push({ ...surround.value.next, path: surround.value.next.path })
  }

  return result
})

const title = post.value.seo?.title || post.value.title
const description = post.value.seo?.description || post.value.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

definePageMeta({
  public: true
})
</script>

<template>
  <div>
    <UContainer v-if="post">
      <UPageHeader :title="post?.title" :description="post?.description">
        <template #headline>
          <UBadge v-if="post?.badge" v-bind="post?.badge" variant="subtle" />
          <span class="text-muted">&middot;</span>
          <time class="text-muted">{{ new Date(post?.date).toLocaleDateString('en', {
            year: 'numeric',
            month: 'short',
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

          <USeparator v-if="surroundLocalized?.length" />

          <UContentSurround :surround="surroundLocalized" />
        </UPageBody>

        <template v-if="post?.body?.toc?.links?.length" #right>
          <UContentToc :links="post.body.toc.links" />
        </template>
      </UPage>
    </UContainer>
  </div>
</template>
