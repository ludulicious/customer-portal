<script setup lang="ts">
import type { AdminOrganizationsResponse, ApiError } from '~~/types'

const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)

// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Admin access required' })
}

const loading = ref(true)
const error = ref('')
const organizations = ref<AdminOrganizationsResponse>([])

const loadOrganizations = async () => {
  try {
    loading.value = true
    organizations.value = await $fetch<AdminOrganizationsResponse>('/api/admin/organizations')
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to load organizations'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrganizations()
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">
          All Organizations
        </h2>
        <UButton icon="i-lucide-refresh-cw" variant="outline" :loading="loading" @click="loadOrganizations">
          Refresh
        </UButton>
      </div>
    </template>

    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
      <p class="text-gray-600 dark:text-gray-400 mt-2">
        Loading organizations...
      </p>
    </div>

    <UAlert v-else-if="error" color="error" variant="soft" :title="error" />

    <div v-else-if="organizations.length === 0" class="text-center py-8">
      <p class="text-gray-600 dark:text-gray-400">
        No organizations found
      </p>
    </div>

    <div v-else class="space-y-4">
      <div v-for="org in organizations" :key="org.id"
        class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-lg">
              {{ org.name }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Slug: {{ org.slug }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              Created: {{ new Date(org.createdAt).toLocaleDateString() }}
            </p>
          </div>
          <UButton :to="`/organization/${org.id}`" variant="outline" size="sm">
            View
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
