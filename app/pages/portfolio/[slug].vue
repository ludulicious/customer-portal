<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()
const localePath = useLocalePath()

const contentPath = computed(() => {
  const path = route.path || ''
  return path.replace(/^\/(en|nl)(?=\/|$)/, '') || '/'
})

const { data: project } = await useAsyncData(
  () => `portfolio-project-${locale.value}-${contentPath.value}`,
  () => queryCollection(locale.value === 'en' ? 'projects_en' : 'projects_nl').path(contentPath.value).first()
)
if (!project.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })
}

const { data: surround } = await useAsyncData(
  () => `portfolio-project-surround-${locale.value}-${contentPath.value}`,
  () => queryCollectionItemSurroundings(
    locale.value === 'en' ? 'projects_en' : 'projects_nl',
    contentPath.value,
    { fields: ['description'] }
  )
)

const surroundLocalized = computed(() => surround.value?.filter(s => s && s.path).map(s => ({ ...s, path: localePath(s.path) })).filter((s): s is typeof s & { path: string } => !!s.path))

const title = project.value.seo?.title || project.value.title
const description = project.value.seo?.description || project.value.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

if (project.value.image?.src) {
  defineOgImage({
    url: project.value.image.src
  })
} else {
  defineOgImageComponent('Saas', {
    headline: 'Portfolio'
  })
}
</script>

<template>
  <div>
    <UContainer v-if="project">
      <UPageHeader
        :title="project.title"
        :description="project.description"
      >
        <template #headline>
          <UBadge
            v-if="project.badge"
            v-bind="project.badge"
            variant="subtle"
          />
        </template>

        <div class="flex flex-wrap items-center gap-3 mt-4">
          <UButton
            :to="project.link || '#'"
            color="primary"
            variant="solid"
            target="_blank"
            size="lg"
            trailing-icon="i-lucide-external-link"
          >
            Visit Project
          </UButton>
        </div>

        <div v-if="project.technologies?.length" class="mt-6">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Technologies Used</h3>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="tech in project.technologies"
              :key="tech"
              variant="soft"
              color="primary"
            >
              {{ tech }}
            </UBadge>
          </div>
        </div>
      </UPageHeader>

      <UPage>
        <UPageBody>
          <ContentRenderer
            v-if="project"
            :value="project"
          />

          <USeparator v-if="surround?.length" />

          <UContentSurround :surround="surroundLocalized" />
        </UPageBody>

        <template
          v-if="project?.body?.toc?.links?.length"
          #right
        >
          <UContentToc :links="project.body.toc.links" />
        </template>
      </UPage>
    </UContainer>
  </div>
</template>
