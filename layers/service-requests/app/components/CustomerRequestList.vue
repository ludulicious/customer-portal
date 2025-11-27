<script setup lang="ts">
const props = defineProps<{
  requests: ServiceRequestWithRelations[]
  loading: boolean
  pagination: { total: number, page: number, limit: number, pages: number }
}>()

const emit = defineEmits<{
  create: []
  select: [id: string]
  filter: [filters: ServiceRequestFilters]
}>()

const currentPage = ref(1)
const filters = reactive({
  status: undefined,
  priority: undefined,
  search: ''
})

watch(filters, () => {
  emit('filter', filters)
})

watch(currentPage, (page) => {
  emit('filter', { ...filters, page })
})

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' }
]

const priorityOptions = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' }
]

const getPriorityColor = (priority: ServiceRequestPriority) => {
  switch (priority) {
    case 'LOW': return 'green'
    case 'MEDIUM': return 'blue'
    case 'HIGH': return 'orange'
    case 'URGENT': return 'red'
    default: return 'gray'
  }
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">My Service Requests</h2>
      <UButton @click="$emit('create')">
        New Request
      </UButton>
    </div>

    <!-- Filters -->
    <div class="flex gap-2">
      <USelect
        v-model="filters.status"
        :options="statusOptions"
        placeholder="Filter by status"
      />
      <USelect
        v-model="filters.priority"
        :options="priorityOptions"
        placeholder="Filter by priority"
      />
      <UInput
        v-model="filters.search"
        placeholder="Search requests..."
        icon="i-lucide-search"
      />
    </div>

    <!-- List -->
    <div v-if="loading">
      <USkeleton v-for="i in 5" :key="i" class="h-20 w-full mb-2" />
    </div>

    <UEmpty
      v-else-if="requests.length === 0"
      icon="i-lucide-ticket"
      description="No service requests found"
    />

    <div v-else class="space-y-3">
      <UCard
        v-for="request in requests"
        :key="request.id"
        class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
        @click="$emit('select', request.id)"
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

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="flex justify-center">
      <UPagination
        v-model="currentPage"
        :total="pagination.total"
        :page-size="pagination.limit"
      />
    </div>
  </div>
</template>
