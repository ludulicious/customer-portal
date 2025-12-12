<script setup lang="ts">
import type { QueryResult } from '~~/shared/types'

const pending = ref(true)
const currentPage = ref(1)
const pageSize = ref(20)
const canLoadMore = ref(false)
const error = ref<Error | null>(null)
const list = ref<ServiceRequestWithRelations[]>([])
const totalCount = ref(0)
const loadData = async () => {
  error.value = null
  pending.value = true
  try {
    const result = await $fetch<QueryResult<ServiceRequestWithRelations>>('/api/service-requests', {
      query: {
        skip: (currentPage.value - 1) * pageSize.value,
        take: pageSize.value
      }
    })
    totalCount.value = result.totalCount
    if (currentPage.value === 1) {
      list.value = result.items
    } else {
      const newItems = result.items.filter(item => !list.value.some(existing => existing.id === item.id))
      list.value = [...list.value, ...newItems]
    }
    // canLoadMore.value = list.value.length < result.totalCount
    canLoadMore.value = false
    console.log('canLoadMore', canLoadMore.value)
    console.log('list', list.value.length)
  } catch (e) {
    console.error(e)
  } finally {
    pending.value = false
  }
}

await loadData()

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

const listContainerRef = ref(null)
useInfiniteScroll(
  listContainerRef,
  async () => {
    currentPage.value++
    await loadData()
  },
  {
    distance: 200,
    canLoadMore: () => canLoadMore.value
  }
)
</script>

<template>
  <UDashboardPanel id="service-requests" class="lg:pb-8">
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-3' }">
        <template #leading>
          <UIcon name="i-lucide-layout-ticket" class="size-6 shrink-0" />
          <span class="text-lg font-semibold text-gray-900 dark:text-white">
            Service Requests
          </span>
        </template>

        <template #right>
          <UButton icon="i-lucide-plus" size="md" class="rounded-full" title="New Service Request" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="h-screen">
        <div ref="listContainerRef" class="flex-1 overflow-y-auto min-h-0">
          <div class="flex flex-col gap-2 p-4 bg-gray-500/5 rounded-lg">
            <UEmpty v-if="list.length === 0 && !pending" icon="i-lucide-ticket"
              description="No service requests found" />
            <div class="space-y-3">
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
            <div v-if="pending" class="py-4 space-y-2">
              <USkeleton v-for="i in 2" :key="i" class="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
