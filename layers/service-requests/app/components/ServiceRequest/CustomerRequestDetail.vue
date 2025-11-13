<script setup lang="ts">
const props = defineProps<{
  request: ServiceRequestWithRelations
  canEdit?: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

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
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div v-if="request" class="space-y-6">
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-bold">{{ request.title }}</h1>
        <div class="flex gap-2 mt-2">
          <ServiceRequestStatusBadge :status="request.status" />
          <UBadge :color="getPriorityColor(request.priority)">
            {{ request.priority }}
          </UBadge>
          <UBadge v-if="request.category" variant="soft">
            {{ request.category }}
          </UBadge>
        </div>
      </div>

      <div class="flex gap-2">
        <UButton
          v-if="canEdit"
          variant="ghost"
          @click="$emit('edit')"
        >
          Edit
        </UButton>
        <UButton
          v-if="canDelete"
          variant="ghost"
          color="error"
          @click="$emit('delete')"
        >
          Delete
        </UButton>
      </div>
    </div>

    <UDivider />

    <div class="prose dark:prose-invert max-w-none">
      <h3>Description</h3>
      <p>{{ request.description }}</p>
    </div>

    <UDivider />

    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span class="font-semibold">Created by:</span>
        {{ request.createdBy.name || request.createdBy.email }}
      </div>
      <div>
        <span class="font-semibold">Created at:</span>
        {{ formatDate(request.createdAt) }}
      </div>
      <div v-if="request.assignedTo">
        <span class="font-semibold">Assigned to:</span>
        {{ request.assignedTo.name || request.assignedTo.email }}
      </div>
      <div v-if="request.resolvedAt">
        <span class="font-semibold">Resolved at:</span>
        {{ formatDate(request.resolvedAt) }}
      </div>
    </div>
  </div>
</template>
