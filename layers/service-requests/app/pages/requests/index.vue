<script setup lang="ts">
import type { QueryResult } from '~~/shared/types'

definePageMeta({
  layout: 'portal',
})
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
// const { copy } = useClipboard()

const totalCount = computed(() => data.value?.totalCount ?? 0)

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

const list = ref<ServiceRequestWithRelations[]>(data.value?.items ?? [])

watch(data, (newData) => {
  if (newData && Array.isArray(newData.items)) {
    if (currentPage.value === 1) {
      // Replace list on first page or refresh
      list.value = newData.items
    } else {
      // Append items when loading more pages
      // Check for duplicates just in case
      const newItems = newData.items.filter(item => !list.value.some(existing => existing.id === item.id))
      list.value = [...list.value, ...newItems]
    }
  }
}, { immediate: true, deep: true })

const isLoadingMore = ref(false)

const onLoadMore = () => {
  console.log('onLoadMore', isLoadingMore.value, pending.value, canLoadMore.value)
  if (isLoadingMore.value || pending.value || !canLoadMore.value) return

  isLoadingMore.value = true
  currentPage.value++
}

const canLoadMore = computed(() => {
  return list.value.length < totalCount.value - 1
})

watch(pending, (isPending) => {
  if (!isPending) {
    isLoadingMore.value = false
  }
})

watch(error, (newError) => {
  if (newError) {
    toast.add({
      title: 'Error loading service requests',
      description: newError.message,
      color: 'error'
    })
    isLoadingMore.value = false
  }
})

const listContainerRef = ref<HTMLElement | null>(null)
useInfiniteScroll(
  listContainerRef,
  () => {
    onLoadMore()
  },
  { distance: 200 }
)
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar :title="t('serviceRequest.title')" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton icon="i-lucide-plus" size="md" class="rounded-full" to="/requests/new" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div ref="listContainerRef" class="h-full overflow-y-auto">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <!-- List -->
          <div v-if="pending && list.length === 0">
            <USkeleton v-for="i in pageSize" :key="i" class="h-20 w-full mb-2" />
          </div>

          <UEmpty v-else-if="list.length === 0 && !pending" icon="i-lucide-ticket" description="No service requests found" />

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

            <div v-if="isLoadingMore || (pending && list.length > 0)" class="py-4 space-y-2">
               <USkeleton v-for="i in 2" :key="i" class="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
