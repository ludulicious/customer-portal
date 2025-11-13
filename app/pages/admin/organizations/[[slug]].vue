<script setup lang="ts">
const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)
const { t } = useI18n()
// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Admin access required' })
}
const route = useRoute()
const slug = route.params.slug as string
const organization = ref<Organization | null>(null)
const loading = ref(true)
const loadOrganization = async () => {
  try {
    console.log('Loading organization', slug)
    loading.value = true
    organization.value = await $fetch<Organization>(`/api/admin/organizations/by-slug/${slug}`)
  } catch (err) {
    const error = err as ApiError
    const message = error.message || 'Failed to load organization'
    console.error(message)
    throw createError({ statusCode: error?.statusCode || 500, message })
  } finally {
    loading.value = false
  }
}

await loadOrganization()
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ t('admin.organization.title', { name: organization?.name }) }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            {{ organization?.name }}
          </p>
        </div>
      </div>
    </UContainer>
  </div>
</template>
