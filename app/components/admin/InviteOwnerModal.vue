<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useOrganization } from '~/composables/useOrganization'

const props = defineProps<{
  organizationId: string
}>()

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()

const formSchema = computed(() => z.object({
  email: z.string().email(t('organization.members.validation.emailInvalid'))
}))

const form = reactive({
  email: ''
})

const inviting = ref(false)

const handleSubmit = async (event: FormSubmitEvent<z.output<typeof formSchema.value>>) => {
  try {
    inviting.value = true

    // Use server-side API endpoint for admins to bypass membership check
    const result = await $fetch(`/api/admin/organizations/${props.organizationId}/invitations`, {
      method: 'POST',
      body: {
        email: event.data.email,
        role: 'owner'
      }
    })

    if (!result) {
      throw new Error(t('admin.organization.detail.errors.sendInvitationFailed'))
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.organization.detail.invitations.sendSuccess'),
      color: 'success'
    })
    open.value = false
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.organization.detail.errors.sendInvitationFailed')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
    emit('error', errorMessage)
  } finally {
    inviting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('admin.organization.detail.invitations.modalTitle')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm :state="form" :schema="formSchema" @submit="handleSubmit" class="space-y-4">
        <UFormField name="email" :label="t('admin.organization.detail.invitations.emailLabel')" required>
          <UInput
            v-model="form.email"
            type="email"
            :placeholder="t('admin.organization.detail.invitations.emailPlaceholder')"
            size="lg"
            class="w-full"
          />
        </UFormField>
        <div class="flex gap-4 justify-end pt-4">
          <UButton
            type="button"
            variant="outline"
            @click="open = false"
          >
            {{ t('admin.organization.detail.invitations.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="inviting"
            color="primary"
          >
            {{ t('admin.organization.detail.invitations.sendButton') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

