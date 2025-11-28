<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { QueryResult } from '~~/shared/types'

const { t } = useI18n()

const currentPage = ref(1)
const pageSize = ref(20)
const { data, pending, error, refresh } = await useAsyncData(
  'service-requests',
  () => $fetch<QueryResult<ServiceRequestWithRelations>>('/api/service-requests', {
    query: {
      skip: (currentPage.value - 1) * pageSize.value,
      take: pageSize.value
    }
  }),
  {
    default: () => ({ items: [], totalCount: 0 }),
  }
)
const toast = useToast()
const { copy } = useClipboard()

const totalCount = computed(() => data.value?.totalCount ?? 0)

const getDropdownActions = (serviceRequest: ServiceRequestWithRelations): DropdownMenuItem[][] => {
  return [
    [
      {
        label: 'Copy user Id',
        icon: 'i-lucide-copy',
        onSelect: () => {
          copy(serviceRequest.id.toString())

          toast.add({
            title: 'User ID copied to clipboard!',
            color: 'success',
            icon: 'i-lucide-circle-check'
          })
        }
      }
    ],
    [
      {
        label: 'Edit',
        icon: 'i-lucide-edit'
      },
      {
        label: 'Delete',
        icon: 'i-lucide-trash',
        color: 'error'
      }
    ]
  ]
}

const getPriorityColor = (priority: ServiceRequestPriority) => {
  switch (priority) {
    case 'LOW': return 'success'
    case 'MEDIUM': return 'info'
    case 'HIGH': return 'warning'
    case 'URGENT': return 'error'
    default: return 'neutral'
  }
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}

watch([currentPage, pageSize], async () => {
  if (currentPage.value === 1) {
    // Reset list when going back to page 1
    list.value = []
  }
  await refresh()
})

const refreshTable = async () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1 // will trigger a refresh
    return
  }
  await refresh()
}

const list = ref<ServiceRequestWithRelations[]>(data.value?.items ?? [])

watch(data, (newData) => {
  if (newData && Array.isArray(newData.items)) {
    if (currentPage.value === 1) {
      // Replace list on first page or refresh
      list.value = newData.items
    } else {
      // Append items when loading more pages
      list.value = [...list.value, ...newData.items]
    }
  }
}, { immediate: true, deep: true })

const isLoadingMore = ref(false)

const onLoadMore = () => {
  if (isLoadingMore.value || pending.value || !canLoadMore.value) return

  isLoadingMore.value = true
  currentPage.value++
  // The watch on currentPage will trigger refresh automatically
}

const canLoadMore = computed(() => {
  return currentPage.value < Math.ceil(totalCount.value / pageSize.value)
})

watch(pending, (isPending) => {
  if (!isPending) {
    isLoadingMore.value = false
  }
})

useInfiniteScroll(
  window,
  () => {
    onLoadMore()
  },
  { distance: 10 }
)
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Page Header -->
    <div class="fixed left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm" style="top: calc(var(--ui-header-height) - 1px);">
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
            <div class="flex items-center space-x-4">
              {{ currentPage }} / {{ Math.ceil(totalCount / pageSize) }}
            </div>
            <UButton to="/service-requests/requests/new" color="primary" icon="i-lucide-plus">
              {{ t('serviceRequest.create') }}
            </UButton>
            <UButton icon="i-lucide-refresh-cw" variant="outline" :loading="pending" class="flex-1 sm:flex-none"
              :title="t('common.refresh')" @click="refreshTable" />
          </div>
        </div>
      </div>
    </div>

    <!-- Content area with top margin to account for fixed headers -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style="margin-top: calc(var(--ui-header-height, 4.5rem) + 40px);">
      <!-- List -->
      <div v-if="pending">
        <USkeleton v-for="i in pageSize" :key="i" class="h-20 w-full mb-2" />
      </div>

      <UEmpty v-else-if="list.length === 0" icon="i-lucide-ticket" description="No service requests found" />

      <div v-else class="space-y-3">
        <UCard v-for="request in list" :key="request.id"
            class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="font-semibold">{{ request.title }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {{ request.description }}
                </p>
                <div class="flex gap-2 mt-2 text-xs text-gray-500">
                  <span>{{ formatDate(request.createdAt) }}</span>
                  <span v-if="request.category">• {{ request.category }}</span>
                </div>
              </div>
              <div class="flex flex-col items-end gap-2">
                <StatusBadge :status="request.status" />
                <UBadge :color="getPriorityColor(request.priority)" variant="soft" size="xs">
                  {{ request.priority }}
                </UBadge>
              </div>
            </div>
          </UCard>
      </div>
    </div>
  </div>
</template>
