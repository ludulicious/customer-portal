<script setup lang="ts">
const props = defineProps<{
  status: ServiceRequestStatus
  variant?: 'solid' | 'outline' | 'soft'
}>()

const statusColor = computed(() => {
  switch (props.status) {
    case 'OPEN': return 'primary'
    case 'IN_PROGRESS': return 'warning'
    case 'RESOLVED': return 'success'
    case 'CLOSED': return 'neutral'
    default: return 'neutral'
  }
})

const { t } = useI18n()

const statusLabel = computed(() => {
  return t(`serviceRequest.status.${props.status.toLowerCase()}`)
})
</script>

<template>
  <UBadge :color="statusColor" :variant="variant">
    {{ statusLabel }}
  </UBadge>
</template>
