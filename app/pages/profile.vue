<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()
const { currentUser, activeOrganizationId, setCurrentUser, myOrganizations } = useUserStore()
const toast = useToast()

// Zod schema for profile form validation
const schema = z.object({
  name: z.string()
    .trim()
    .min(1, t('profile.validation.nameRequired'))
    .max(255, t('profile.validation.nameMaxLength')),
  image: z.union([
    z.string().url(t('profile.validation.imageInvalidUrl')),
    z.literal('').transform(() => null),
    z.null()
  ]).optional()
}).refine(
  (data) => data.name !== undefined || data.image !== undefined,
  {
    message: t('profile.validation.atLeastOneField')
  }
)

type Schema = z.output<typeof schema>

// Form state
const form = reactive<Partial<Schema>>({
  name: '',
  image: ''
})

const isLoading = ref(false)
const isDirty = ref(false)

// Initialize form with current user data
watchEffect(() => {
  if (currentUser) {
    form.name = currentUser.name || ''
    form.image = currentUser.image || ''
    isDirty.value = false
  }
})

// Watch for form changes
watch(() => [form.name, form.image], () => {
  if (currentUser) {
    const nameChanged = form.name !== (currentUser.name || '')
    const imageChanged = form.image !== (currentUser.image || '')
    isDirty.value = nameChanged || imageChanged
  }
}, { deep: true })

// Page metadata
useSeoMeta({
  title: t('profile.title'),
  description: t('profile.description')
})

const handleSubmit = async (event: FormSubmitEvent<Schema>) => {
  if (!currentUser) return

  isLoading.value = true
  try {
    const response = await $fetch<{
      success: boolean
      message: string
      user?: {
        id: string
        name: string
        email: string
        image: string | null
      }
    }>('/api/profile', {
      method: 'PATCH',
      body: {
        name: event.data.name?.trim(),
        image: event.data.image === null || event.data.image === '' ? null : event.data.image
      }
    })

    if (response.success && response.user) {
      // Update the user store with new data
      setCurrentUser({
        ...currentUser,
        name: response.user.name,
        image: response.user.image || undefined
      })

      toast.add({
        title: t('profile.messages.success'),
        description: t('profile.messages.profileUpdated'),
        color: 'success'
      })

      isDirty.value = false
    }
  } catch (error: unknown) {
    console.error('Error updating profile:', error)
    const errorMessage = (error as { data?: { message?: string }, message?: string })?.data?.message
      || (error as { message?: string })?.message
      || t('profile.messages.updateFailed')
    toast.add({
      title: t('profile.messages.error'),
      description: errorMessage,
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

const handleReset = () => {
  if (currentUser) {
    form.name = currentUser.name || ''
    form.image = currentUser.image || ''
    isDirty.value = false
  }
}

const isActiveOrganization = (organizationId: string) => {
  if (!activeOrganizationId) return false
  return activeOrganizationId === organizationId
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t('profile.title') }}
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {{ $t('profile.description') }}
        </p>
      </div>

      <UCard class="mb-8">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ $t('profile.sections.profileInfo') }}
            </h2>
          </div>
        </template>

        <UForm :state="form" :schema="schema" class="space-y-6" @submit="handleSubmit">
          <!-- Profile Picture Section -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div class="shrink-0">
              <UAvatar :src="form.image || undefined" :alt="form.name || currentUser?.email || 'User'"
                :text="form.name ? form.name.charAt(0).toUpperCase() : (currentUser?.email?.charAt(0).toUpperCase() || 'U')"
                size="xl" class="ring-2 ring-gray-200 dark:ring-gray-700" />
            </div>
            <div class="flex-1 w-full">
              <UFormField
                :label="$t('profile.fields.profilePicture')"
                :description="$t('profile.fields.profilePictureDescription')"
                name="image"
              >
                <UInput v-model="form.image" type="url" :placeholder="$t('profile.fields.profilePicturePlaceholder')"
                  icon="i-lucide-image" class="w-full" />
              </UFormField>
            </div>
          </div>

          <UFormField
            :label="$t('profile.fields.name')"
            :description="$t('profile.fields.nameDescription')"
            name="name"
            required
          >
            <UInput v-model="form.name" type="text" :placeholder="$t('profile.fields.namePlaceholder')"
              icon="i-lucide-user" class="w-full" required />
          </UFormField>

          <UFormField
            :label="$t('profile.fields.email')"
            :description="$t('profile.fields.emailDescription')"
            name="email"
          >
            <UInput :model-value="currentUser?.email || ''" type="email" disabled icon="i-lucide-mail"
              class="w-full" />
          </UFormField>

          <!-- Form Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <UButton type="button" variant="ghost" color="neutral" :disabled="!isDirty || isLoading"
              @click="handleReset">
              {{ $t('common.reset') }}
            </UButton>
            <UButton type="submit" :loading="isLoading" :disabled="!isDirty">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </UForm>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ $t('profile.sections.organizations') }}
          </h2>
        </template>
        <div v-if="myOrganizations === null || myOrganizations === undefined">Loading...</div>
        <div v-else-if="myOrganizations.length === 0">No organizations found.</div>
        <div v-else class="space-y-6">
          <div v-for="organization in myOrganizations" :key="organization.id" class="flex items-start justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ organization.name }}</h3>
                <UBadge v-if="isActiveOrganization(organization.id)" color="success" variant="subtle">
                  {{ $t('profile.badges.active') }}
                </UBadge>
                <UBadge v-else color="warning" variant="subtle">{{ 'No active organization' }}</UBadge>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ organization.slug }}</p>
              <p class="text-xs text-gray-500 mt-1">
                {{ $t('common.createdAt') }}: {{ new Date(organization.createdAt).toLocaleDateString() }}
              </p>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
