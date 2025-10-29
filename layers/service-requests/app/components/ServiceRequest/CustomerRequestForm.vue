<template>
  <UForm :state="state" :schema="schema" @submit="handleSubmit">
    <UFormField label="Title" name="title" required>
      <UInput v-model="state.title" placeholder="Brief description of your request" />
    </UFormField>
    
    <UFormField label="Description" name="description" required>
      <UTextarea 
        v-model="state.description" 
        placeholder="Provide detailed information about your request"
        :rows="6"
      />
    </UFormField>
    
    <UFormField label="Priority" name="priority">
      <USelect 
        v-model="state.priority" 
        :options="priorityOptions"
      />
    </UFormField>
    
    <UFormField label="Category" name="category">
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
  category: props.initialData?.category || ''
})

const schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.string().max(100).optional()
})

const priorityOptions = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' }
]

const handleSubmit = () => {
  emit('submit', state)
}
</script>

