<script setup lang="ts">
import type { QueryResult } from '~~/shared/types'

const pending = ref(true)
const currentPage = ref(1)
const pageSize = ref(5)
const canLoadMore = ref(false)
const error = ref<Error | null>(null)
const list = ref<ServiceRequestWithRelations[]>([])
const totalCount = ref(0)
const initialLoadComplete = ref(false)
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
      const newItems = result.items.filter(item => !list.value.some((existing: ServiceRequestWithRelations) => existing.id === item.id))
      list.value = [...list.value, ...newItems]
    }
    canLoadMore.value = list.value.length < result.totalCount
  } catch (e) {
    console.error(e)
  } finally {
    pending.value = false
  }
}

await loadData()
initialLoadComplete.value = true

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

const listContainerRef = ref<HTMLElement | null>(null)
const autoFillInProgress = ref(false)

/**
 * If the list container is taller than the content (no scrollbar yet) but we
 * still have more data, keep fetching pages until it becomes scrollable (or we
 * run out of data). This prevents "infinite scroll stuck" on tall viewports.
 */
const autoFillUntilScrollable = async () => {
  if (!import.meta.client) return
  if (autoFillInProgress.value) return
  if (pending.value || !canLoadMore.value) return

  autoFillInProgress.value = true
  try {
    let safety = 0
    // Keep loading while there's no overflow to allow scrolling.
    while (
      canLoadMore.value
      && !pending.value
      && listContainerRef.value
      && listContainerRef.value.scrollHeight <= listContainerRef.value.clientHeight + 16
    ) {
      if (safety++ > 10) break
      currentPage.value++
      await loadData()
      await nextTick()
    }
  } finally {
    autoFillInProgress.value = false
  }
}

// Simple scroll-based infinite scroll
const handleScroll = (event: Event) => {
  if (!initialLoadComplete.value || pending.value || !canLoadMore.value) return

  const target = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight

  // Load more when within 200px of bottom
  if (distanceFromBottom < 200) {
    currentPage.value++
    loadData()
  }
}

onMounted(() => {
  if (listContainerRef.value) {
    listContainerRef.value.addEventListener('scroll', handleScroll, { passive: true })
  }

  // After mount we can measure the container; auto-fill if needed.
  nextTick(() => {
    autoFillUntilScrollable()
  })
})

onUnmounted(() => {
  if (listContainerRef.value) {
    listContainerRef.value.removeEventListener('scroll', handleScroll)
  }
})

watch([pending, canLoadMore, () => list.value.length], () => {
  // After any load finishes, ensure the viewport isn't "too tall" for infinite scroll.
  if (!pending.value && canLoadMore.value) {
    autoFillUntilScrollable()
  }
})
</script>

<template>
  <UDashboardPanel
    id="service-requests"
    class="lg:pb-8 min-h-0 overflow-hidden"
    style="height: calc(100dvh - 12rem);"
    :ui="{ body: 'flex flex-col gap-4 sm:gap-6 flex-1 min-h-0 p-4 sm:p-6 overflow-hidden' }"
  >
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
      <div ref="listContainerRef" class="flex-1 min-h-0 overflow-y-auto">
        <UEmpty
          v-if="list.length === 0 && !pending"
          icon="i-lucide-ticket"
          description="No service requests found"
        />

        <div class="space-y-3">
          <UCard
            v-for="request in list"
            :key="request.id"
            class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
          >
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
    </template>
  </UDashboardPanel>
</template>
