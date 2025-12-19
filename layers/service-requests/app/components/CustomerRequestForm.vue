<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
  initialData?: Partial<ServiceRequest>
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: ServiceRequestCreateInput]
  cancel: []
}>()

const editMode = computed(() => !!props.initialData?.id)

const state = reactive({
  title: props.initialData?.title || '',
  description: props.initialData?.description || '',
  priority: props.initialData?.priority || 'MEDIUM',
  category: props.initialData?.category || '',
  status: props.initialData?.status || 'OPEN'
})

const schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.string().max(100).optional()
})

const { priorityOptions } = useServiceRequests()
const { statusOptions } = useServiceRequests()

const handleSubmit = () => {
  emit('submit', state)
}
</script>

<template>
  <UForm :state="state" :schema="schema" @submit="handleSubmit">
    <UFormField label="Title" name="title">
      <UInput v-model="state.title" placeholder="Brief description of your request!" class="w-full"/>
    </UFormField>

    <UFormField label="Description" name="description" required class="w-full">
      <UTextarea
        v-model="state.description"
        class="w-full"
        placeholder="Provide detailed information about your request"
        :rows="6"
      />
    </UFormField>

    <UFormField label="Priority" name="priority" class="w-full">
      <USelect
        v-model="state.priority"
        class="w-full"
        :items="priorityOptions"
      />
    </UFormField>
    <UFormField label="Status" name="status" class="w-full">
      <USelect
        v-model="state.status"
        class="w-full"
        :items="statusOptions"
      />
    </UFormField>

    <UFormField label="Category" name="category" class="w-full">
      <UInput v-model="state.category" placeholder="e.g., Technical, Billing, General" />
    </UFormField>

    <div class="flex gap-2">
      <UButton type="submit" :loading="loading">
        {{ editMode ? 'Update Request' : 'Submit Request' }}
      </UButton>
      <UButton variant="ghost" @click="$emit('cancel')">
        Cancel
      </UButton>
    </div>
  </UForm>
</template>
