<script setup lang="ts">
const { t } = useI18n()
const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
const toast = useToast()

// Form state
const form = ref({
  name: '',
  image: ''
})

const isLoading = ref(false)
const isDirty = ref(false)

// Initialize form with current user data
watchEffect(() => {
  if (currentUser.value) {
    form.value = {
      name: currentUser.value.name || '',
      image: currentUser.value.image || ''
    }
    isDirty.value = false
  }
})

// Watch for form changes
watch(form, () => {
  if (currentUser.value) {
    const nameChanged = form.value.name !== (currentUser.value.name || '')
    const imageChanged = form.value.image !== (currentUser.value.image || '')
    isDirty.value = nameChanged || imageChanged
  }
}, { deep: true })

// Page metadata
useSeoMeta({
  title: t('profile.title'),
  description: t('profile.description')
})

const handleSubmit = async () => {
  if (!currentUser.value) return

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
        name: form.value.name.trim(),
        image: form.value.image.trim() || null
      }
    })

    if (response.success && response.user) {
      // Update the user store with new data
      userStore.setUser({
        ...currentUser.value,
        name: response.user.name,
        image: response.user.image || undefined
      })

      // Refresh session to get updated user data
      const { authClient } = await import('~/utils/auth-client')
      await authClient.getSession()

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
  if (currentUser.value) {
    form.value = {
      name: currentUser.value.name || '',
      image: currentUser.value.image || ''
    }
    isDirty.value = false
  }
}

const organizations = authClient.useListOrganizations()
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

        <UForm :state="form" class="space-y-6" @submit="handleSubmit">
          <!-- Profile Picture Section -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div class="shrink-0">
              <UAvatar :src="form.image || undefined" :alt="form.name || currentUser?.email || 'User'"
                :text="form.name ? form.name.charAt(0).toUpperCase() : (currentUser?.email?.charAt(0).toUpperCase() || 'U')"
                size="xl" class="ring-2 ring-gray-200 dark:ring-gray-700" />
            </div>
            <div class="flex-1 w-full">
              <UInput v-model="form.image" type="url" :placeholder="$t('profile.fields.profilePicturePlaceholder')"
                icon="i-lucide-image" />
            </div>
          </div>

          <UInput v-model="form.name" type="text" :placeholder="$t('profile.fields.namePlaceholder')"
            icon="i-lucide-user" class="w-full" required />

          <UInput :model-value="currentUser?.email || ''" type="email" disabled icon="i-lucide-mail"
            class="w-full mt-4" />

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
        <div v-if="organizations.isPending">Loading...</div>
        <div v-else-if="organizations.data === null">No organizations found.</div>
        <div v-else class="space-y-6">
          <div v-for="organization in organizations.data" :key="organization.id">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ organization.name }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ organization.slug }}</p>
            <p class="text-xs text-gray-500 mt-1">
              {{ $t('common.createdAt') }}: {{ new Date(organization.createdAt).toLocaleDateString() }}
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
