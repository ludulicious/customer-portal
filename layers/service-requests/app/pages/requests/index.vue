<script setup lang="ts">
const {
  requests,
  loading,
  pagination,
  fetchRequests
} = useServiceRequests()

const { t } = useI18n()
await fetchRequests()

const handleFilter = (filters: ServiceRequestFilters) => {
  fetchRequests(filters)
}

</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Page Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ t('serviceRequest.title') }}
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {{ t('serviceRequest.subTitle') }}
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <UButton to="/service-requests/requests/new" color="primary" variant="outline" icon="i-plus">
              {{ t('serviceRequest.create') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <p>Hier komen de requests</p>
    </div>
  </div>
</template>
