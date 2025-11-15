<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

// Redirect non-admins - only admins can create organizations
const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)

if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Only admins can create organizations. Please contact an administrator.' })
}

// Redirect to admin create page
const router = useRouter()
router.replace('/admin/organizations/create')
</script>

<template>
  <div>
    <h1>Redirecting...</h1>
  </div>
</template>
<!-- <script setup lang="ts">
const { createOrganization } = useCurrentOrganization()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const formData = ref({
  name: '',
  slug: ''
})

// Auto-generate slug from name
watch(() => formData.value.name, (name) => {
  if (name) {
    formData.value.slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
})

const handleSubmit = async () => {
  if (!formData.value.name || !formData.value.slug) {
    error.value = 'Please fill in all required fields'
    return
  }

  try {
    loading.value = true
    error.value = ''

    await createOrganization({
      name: formData.value.name,
      slug: formData.value.slug
    })

    // Redirect to organization page
    await router.push('/organization')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    error.value = errorMessage || 'Failed to create organization'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer class="max-w-2xl">
      <UCard>
        <template #header>
          <h1 class="text-2xl font-bold">Create Organization</h1>
        </template>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <UFormGroup label="Organization Name" required>
            <UInput
              v-model="formData.name"
              placeholder="Enter organization name"
              required
            />
          </UFormGroup>

          <UFormGroup label="Organization Slug" required>
            <UInput
              v-model="formData.slug"
              placeholder="organization-slug"
              required
            />
            <template #hint>
              URL-friendly identifier for your organization
            </template>
          </UFormGroup>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
            class="mb-4"
          />

          <div class="flex gap-4">
            <UButton
              type="submit"
              :loading="loading"
              color="primary"
            >
              Create Organization
            </UButton>
            <UButton
              type="button"
              variant="outline"
              @click="router.push('/organization')"
            >
              Cancel
            </UButton>
          </div>
        </form>
      </UCard>
    </UContainer>
  </div>
</template> -->
