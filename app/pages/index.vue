<script setup lang="ts">
const { locale } = useI18n()

const { data: page } = await useAsyncData(
  () => `index-${locale.value}`,
  () => queryCollection(locale.value === 'en' ? 'index_en' : 'index_nl' as any).first()
)

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  titleTemplate: '',
  title,
  ogTitle: title,
  description,
  ogDescription: description
})
</script>

<template>
  <div>

    <div v-if="page">
      <UPageHero :title="page.title" v-if="page.hero" :description="page.description" :links="page.hero.links"
        class="py-2 md:py-4 mb-0">
        <template #top>
          <HeroBackground />
        </template>

        <template #title>
          <MDC :value="page.title" unwrap="p" />
        </template>
        <div class="relative flex justify-center items-center">
          <NuxtImg src="/images/home/office.png" alt="Our fake office" class="rounded-lg" height="600" width="1200" />
        </div>
      </UPageHero>

      <UPageSection v-if="page.features" :title="page.features.title" :description="page.features.description"
        class="mt-0">
        <UPageGrid>
          <UPageCard v-for="(item, index) in page.features.items" :key="index" v-bind="item" spotlight />
        </UPageGrid>
      </UPageSection>

      <UPageSection id="testimonials" v-if="page.testimonials" :headline="page.testimonials.headline"
        :title="page.testimonials.title" :description="page.testimonials.description">
        <UPageColumns class="xl:columns-4">
          <UPageCard v-for="(testimonial, index) in page.testimonials.items" :key="index" variant="subtle"
            :description="testimonial.quote"
            :ui="{ description: 'before:content-[open-quote] after:content-[close-quote]' }">
            <template #footer>
              <UUser v-bind="testimonial.user" size="lg" />
            </template>
          </UPageCard>
        </UPageColumns>
      </UPageSection>

      <USeparator />

      <UPageCTA v-bind="page.cta" variant="naked" class="overflow-hidden">
        <LazyStarsBg />
      </UPageCTA>
    </div>
  </div>
</template>
