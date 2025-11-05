<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
      <p class="text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="error"
    />

    <UForm v-else @submit="updateOrganization" class="space-y-4">
      <UFormGroup label="Organization Name" required>
        <UInput
          v-model="formData.name"
          type="text"
          placeholder="Organization name"
          required
        />
      </UFormGroup>

      <UFormGroup label="Organization Slug" required>
        <UInput
          v-model="formData.slug"
          type="text"
          placeholder="organization-slug"
          required
        />
        <template #hint>
          URL-friendly identifier for your organization
        </template>
      </UFormGroup>

      <UFormGroup label="Logo URL">
        <UInput
          v-model="formData.logo"
          type="url"
          placeholder="https://example.com/logo.png"
        />
      </UFormGroup>

      <div class="flex gap-4">
        <UButton
          type="submit"
          :disabled="updating"
          :loading="updating"
        >
          Update Organization
        </UButton>
        <UButton
          type="button"
          color="error"
          variant="outline"
          @click="deleteOrganization"
        >
          Delete Organization
        </UButton>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import type { ApiError, Organization } from '~~/types'

const loading = ref(true)
const updating = ref(false)
const error = ref('')
const formData = ref({
  id: '',
  name: '',
  slug: '',
  logo: ''
})

const loadOrganization = async () => {
  try {
    loading.value = true
    const { data: member } = await authClient.organization.getActiveMember()
    if (member?.organizationId) {
      // Fetch organization details using organizationId
      const organization = await $fetch<Organization>(`/api/organizations/${member.organizationId}`)
      if (organization) {
        formData.value = {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo || ''
        }
      }
    }
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to load organization'
  } finally {
    loading.value = false
  }
}

const updateOrganization = async () => {
  try {
    updating.value = true
    await authClient.organization.update({
      organizationId: formData.value.id,
      data: formData.value
    })
    // Show success message
    error.value = ''
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to update organization'
  } finally {
    updating.value = false
  }
}

const deleteOrganization = async () => {
  if (!confirm('Are you sure you want to delete this organization?')) return

  try {
    await authClient.organization.delete({
      organizationId: formData.value.id
    })
    // Redirect to organization list or create new
    await navigateTo('/organizations')
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to delete organization'
  }
}

onMounted(() => {
  loadOrganization()
})
</script>
