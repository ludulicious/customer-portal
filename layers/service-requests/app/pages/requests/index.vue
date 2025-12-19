<script setup lang="ts">
import type { QueryResult } from '~~/shared/types'

const { t } = useI18n()

// Mobile breakpoint detection
const breakpoints = useBreakpoints({
  mobile: 768
})
const isMobile = breakpoints.smaller('mobile')

// Filter modal state
const showFiltersModal = ref(false)
const showSortModal = ref(false)

const pending = ref(true)
const currentPage = ref(1)
const pageSize = ref(10)
const canLoadMore = ref(false)
const error = ref<Error | null>(null)
const list = ref<ServiceRequestWithRelations[]>([])
const totalCount = ref(0)
const initialLoadComplete = ref(false)

// Helper function to get status badge text
const getStatusBadgeText = (status: ServiceRequestStatus): string => {
  return t(`serviceRequest.statusBadge.${status.toLowerCase()}`)
}

// Helper function to get priority badge text
const getPriorityBadgeText = (priority: ServiceRequestPriority): string => {
  return t(`serviceRequest.priorityBadge.${priority.toLowerCase()}`)
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
// Filter state
const statusFilter = ref<ServiceRequestStatus | undefined>(undefined)
const priorityFilter = ref<ServiceRequestPriority | undefined>(undefined)
const categoryFilter = ref<string | undefined>(undefined)
const searchQuery = ref('')

// Sort state
const sortBy = ref<'createdAt' | 'status' | 'priority'>('createdAt')
const sortDir = ref<'asc' | 'desc'>('desc')

const sortOptions = computed(() => [
  { label: t('serviceRequest.fields.createdAt'), value: 'createdAt' as const },
  { label: t('serviceRequest.fields.status'), value: 'status' as const },
  { label: t('serviceRequest.fields.priority'), value: 'priority' as const }
])

const currentSortLabel = computed(() => {
  return sortOptions.value.find(o => o.value === sortBy.value)?.label || ''
})

const sortDropdownItems = computed(() => [
  sortOptions.value.map(option => ({
    label: option.label,
    icon: sortBy.value === option.value ? 'i-lucide-check' : undefined,
    onSelect: () => {
      sortBy.value = option.value
    }
  }))
])

const toggleSortDir = () => {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}

// Filter options
const statusOptions = computed(() => [
  { label: 'All Statuses', value: undefined },
  {
    label: t('serviceRequest.status.open'),
    value: 'OPEN' as ServiceRequestStatus,
    badgeText: getStatusBadgeText('OPEN'),
    badgeColor: 'primary' as const
  },
  {
    label: t('serviceRequest.status.in_progress'),
    value: 'IN_PROGRESS' as ServiceRequestStatus,
    badgeText: getStatusBadgeText('IN_PROGRESS'),
    badgeColor: 'warning' as const
  },
  {
    label: t('serviceRequest.status.resolved'),
    value: 'RESOLVED' as ServiceRequestStatus,
    badgeText: getStatusBadgeText('RESOLVED'),
    badgeColor: 'success' as const
  },
  {
    label: t('serviceRequest.status.closed'),
    value: 'CLOSED' as ServiceRequestStatus,
    badgeText: getStatusBadgeText('CLOSED'),
    badgeColor: 'neutral' as const
  }
])

const priorityOptions = computed(() => [
  { label: 'All Priorities', value: undefined },
  {
    label: t('serviceRequest.priority.low'),
    value: 'LOW' as ServiceRequestPriority,
    badgeText: getPriorityBadgeText('LOW'),
    badgeColor: getPriorityColor('LOW')
  },
  {
    label: t('serviceRequest.priority.medium'),
    value: 'MEDIUM' as ServiceRequestPriority,
    badgeText: getPriorityBadgeText('MEDIUM'),
    badgeColor: getPriorityColor('MEDIUM')
  },
  {
    label: t('serviceRequest.priority.high'),
    value: 'HIGH' as ServiceRequestPriority,
    badgeText: getPriorityBadgeText('HIGH'),
    badgeColor: getPriorityColor('HIGH')
  },
  {
    label: t('serviceRequest.priority.urgent'),
    value: 'URGENT' as ServiceRequestPriority,
    badgeText: getPriorityBadgeText('URGENT'),
    badgeColor: getPriorityColor('URGENT')
  }
])

// Extract unique categories from loaded requests
const categoryOptions = computed(() => {
  const categories = new Set<string>()
  list.value.forEach(request => {
    if (request.category) {
      categories.add(request.category)
    }
  })
  const sortedCategories = Array.from(categories).sort()
  return [
    { label: 'All Categories', value: undefined },
    ...sortedCategories.map(cat => ({ label: cat, value: cat }))
  ]
})

const loadData = async () => {
  error.value = null
  pending.value = true
  try {
    const query: Record<string, string | number | undefined> = {
      skip: (currentPage.value - 1) * pageSize.value,
      take: pageSize.value
    }

    if (statusFilter.value) {
      query.status = statusFilter.value
    }

    if (priorityFilter.value) {
      query.priority = priorityFilter.value
    }

    if (categoryFilter.value) {
      query.category = categoryFilter.value
    }

    if (searchQuery.value.trim()) {
      query.search = searchQuery.value.trim()
    }

    query.sortBy = sortBy.value
    query.sortDir = sortDir.value

    const result = await $fetch<QueryResult<ServiceRequestWithRelations>>('/api/service-requests', {
      query
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

const refresh = async () => {
  currentPage.value = 1
  list.value = []
  await loadData()
}
// Debounced search function
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    list.value = []
    loadData()
  }, 300) // 300ms debounce
}

// Watch filters and reset pagination when they change
watch([statusFilter, priorityFilter, categoryFilter], () => {
  currentPage.value = 1
  list.value = []
  loadData()
})

watch([sortBy, sortDir], () => {
  currentPage.value = 1
  list.value = []
  loadData()
})

// Watch search query with debouncing
watch(searchQuery, () => {
  handleSearch()
})

await loadData()
initialLoadComplete.value = true

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}

const listContainerRef = ref<HTMLElement | null>(null)
const loadMoreInProgress = ref(false)

const loadMore = async () => {
  if (!initialLoadComplete.value) return
  if (pending.value || loadMoreInProgress.value) return
  if (!canLoadMore.value) return

  // Prevent "load everything instantly" when the container isn't scrollable yet.
  const el = listContainerRef.value
  if (el && el.scrollHeight <= el.clientHeight + 16) return

  loadMoreInProgress.value = true
  try {
    currentPage.value++
    await loadData()
    await nextTick()
  } finally {
    loadMoreInProgress.value = false
  }
}

useInfiniteScroll(listContainerRef, loadMore, {
  distance: 200,
  canLoadMore: () => initialLoadComplete.value && canLoadMore.value && !pending.value && !loadMoreInProgress.value
})
</script>

<template>
  <UDashboardPanel
    id="service-requests"
    class="lg:pb-8 min-h-0 overflow-hidden"
    style="height: calc(100dvh - var(--ui-header-height));"
    :ui="{ body: 'flex flex-col gap-4 sm:gap-6 flex-1 min-h-0 p-4 sm:p-6 overflow-hidden' }"
  >
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-3' }" :toggle="false">
        <template #leading>
          <UIcon name="i-lucide-ticket" class="size-6 shrink-0" />
          <span class="text-lg font-semibold text-gray-900 dark:text-white">
            Service Requests
          </span>
        </template>

        <template #right>
          <div class="flex gap-2 w-full sm:w-auto">
          <UButton
            icon="i-lucide-plus"
            color="primary"
            :to="'/admin/organizations/create'"
            class="flex-1 sm:flex-none"
            :title="t('serviceRequest.create')"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            variant="outline"
            :loading="pending"
            class="flex-1 sm:flex-none"
            :title="t('common.refresh')"
            @click="refresh"
          />
        </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-2 w-full">
            <UInput
              v-model="searchQuery"
              :placeholder="t('common.searchPlaceholder')"
              icon="i-lucide-search"
              :loading="pending"
              class="flex-1 max-w-md"
              clearable
            />
            <USelect
              v-if="!isMobile"
              v-model="statusFilter"
              :items="statusOptions"
              placeholder="Filter by status"
              class="w-48"
            >
              <template #item="{ item }">
                <div class="flex items-center justify-between w-full gap-2">
                  <span class="flex-1 truncate">{{ item.label }}</span>
                  <UBadge
                    v-if="item.badgeText"
                    :color="item.badgeColor"
                    size="xs"
                    class="shrink-0 min-w-[100px] justify-center"
                  >
                    {{ item.badgeText }}
                  </UBadge>
                </div>
              </template>
            </USelect>
            <USelect
              v-if="!isMobile"
              v-model="priorityFilter"
              :items="priorityOptions"
              placeholder="Filter by priority"
              class="w-48"
            >
              <template #item="{ item }">
                <div class="flex items-center justify-between w-full gap-2">
                  <span class="flex-1 truncate">{{ item.label }}</span>
                  <UBadge
                    v-if="item.badgeText"
                    :color="item.badgeColor as any"
                    size="xs"
                    class="shrink-0 min-w-[100px] justify-center"
                  >
                    {{ item.badgeText }}
                  </UBadge>
                </div>
              </template>
            </USelect>
            <USelect
              v-if="!isMobile"
              v-model="categoryFilter"
              :items="categoryOptions"
              placeholder="Filter by category"
              class="w-48"
            />
          </div>
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              v-if="isMobile"
              icon="i-lucide-filter"
              variant="outline"
              @click="showFiltersModal = true"
            >
              Filters
            </UButton>
            <UButton
              v-if="isMobile"
              icon="i-lucide-arrow-down-up"
              variant="outline"
              :title="t('common.sort')"
              @click="showSortModal = true"
            >
              {{ t('common.sort') }}
            </UButton>

            <UDropdownMenu
              v-if="!isMobile"
              :items="sortDropdownItems"
              :content="{ align: 'end', collisionPadding: 12 }"
            >
              <UButton
                icon="i-lucide-arrow-down-up"
                variant="outline"
                class="w-48 justify-between"
              >
                <span class="truncate">{{ currentSortLabel }}</span>
                <UIcon name="i-lucide-chevron-down" class="size-4 opacity-60" />
              </UButton>
            </UDropdownMenu>
            <UButton
              v-if="!isMobile"
              :icon="sortDir === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'"
              variant="outline"
              :title="sortDir === 'asc' ? t('common.ascending') : t('common.descending')"
              @click="toggleSortDir"
            />
          </div>
        </template>
      </UDashboardToolbar>

      <!-- Mobile Filters Modal -->
      <UModal v-model:open="showFiltersModal" title="Filters" :ui="{ content: 'w-full sm:max-w-md' }">
        <template #body>
          <div class="space-y-4">
            <UFormField label="Status">
              <USelect
                v-model="statusFilter"
                class="w-full"
                :items="statusOptions"
                placeholder="Filter by status"
              >
                <template #item="{ item }">
                  <div class="flex items-center justify-between w-full gap-2">
                    <span class="flex-1 truncate">{{ item.label }}</span>
                    <UBadge
                      v-if="item.badgeText"
                      :color="item.badgeColor"
                      size="xs"
                      class="shrink-0 min-w-[100px] justify-center"
                    >
                      {{ item.badgeText }}
                    </UBadge>
                  </div>
                </template>
              </USelect>
            </UFormField>

            <UFormField label="Priority">
              <USelect
                v-model="priorityFilter"
                :items="priorityOptions"
                placeholder="Filter by priority"
                class="w-full"
              >
                <template #item="{ item }">
                  <div class="flex items-center justify-between w-full gap-2">
                    <span class="flex-1 truncate">{{ item.label }}</span>
                    <UBadge
                      v-if="item.badgeText"
                      :color="item.badgeColor as any"
                      size="xs"
                      class="shrink-0 min-w-[100px] justify-center"
                    >
                      {{ item.badgeText }}
                    </UBadge>
                  </div>
                </template>
              </USelect>
            </UFormField>

            <UFormField label="Category">
              <USelect
                v-model="categoryFilter"
                class="w-full"
                :items="categoryOptions"
                placeholder="Filter by category"
              />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="outline"
              @click="showFiltersModal = false"
            >
              Close
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Mobile Sort Modal -->
      <UModal v-model:open="showSortModal" :title="t('common.sort')" :ui="{ content: 'w-full sm:max-w-md' }">
        <template #body>
          <div class="space-y-4">
            <UFormField :label="t('common.sortBy')">
              <USelect
                v-model="sortBy"
                class="w-full"
                :items="sortOptions"
                :placeholder="t('common.sortBy')"
              />
            </UFormField>

            <UFormField :label="t('common.direction')">
              <div class="flex gap-2">
                <UButton
                  class="flex-1"
                  :variant="sortDir === 'asc' ? 'solid' : 'outline'"
                  :icon="sortDir === 'asc' ? 'i-lucide-check' : undefined"
                  @click="sortDir = 'asc'"
                >
                  {{ t('common.ascending') }}
                </UButton>
                <UButton
                  class="flex-1"
                  :variant="sortDir === 'desc' ? 'solid' : 'outline'"
                  :icon="sortDir === 'desc' ? 'i-lucide-check' : undefined"
                  @click="sortDir = 'desc'"
                >
                  {{ t('common.descending') }}
                </UButton>
              </div>
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showSortModal = false">
              {{ t('common.close') }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
    <template #body>
      <div ref="listContainerRef" class="flex-1 min-h-0 overflow-y-auto p-2">
        <!-- Keep content away from the scrollbar (works even with overlay scrollbars) -->
        <div class="pr-10">
          <UEmpty
            v-if="list.length === 0 && !pending"
            icon="i-lucide-ticket"
            description="No service requests found"
          />

          <div class="space-y-4">
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
                    {{ getPriorityBadgeText(request.priority) }}
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

      <div class="shrink-0 border-t border-default px-4 py-2 text-sm text-muted flex items-center justify-between">
        <span>
          {{ t('common.totalRecords') }}: <span class="font-medium text-highlighted">{{ totalCount }}</span>
        </span>
        <span>
          {{ t('common.loaded') }}: <span class="font-medium text-highlighted">{{ list.length }}</span>
        </span>
      </div>
    </template>
  </UDashboardPanel>
</template>
