<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '~/utils/auth-client'
import type { ApiError, Organization } from '~~/shared/types'

const emit = defineEmits<{
  updated: []
  canceled: []
}>()

const loading = ref(true)
const updating = ref(false)
const error = ref('')
const memberRole = ref<string | null>(null)
const originalSlug = ref('')
const slugStatus = ref<'idle' | 'checking' | 'available' | 'unavailable' | 'error'>('idle')
const slugMessage = ref('')
const fileRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const formState = reactive({
  id: '',
  name: '',
  slug: '',
  logo: ''
})

const normalizeSlug = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '')

const formSchema = computed(() => z.object({
  name: z.string().min(1, 'Organization name is required'),
  slug: z.string()
    .min(1, 'Organization slug is required')
    .transform((value) => normalizeSlug(value))
    .refine((value) => /^[a-z0-9-]+$/.test(value), {
      message: 'Slug must be lowercase letters, numbers, and hyphens only'
    }),
  logo: z.string().url('Logo must be a valid URL').optional().or(z.literal(''))
}))

const loadOrganization = async () => {
  try {
    loading.value = true
    const { data: member } = await authClient.organization.getActiveMember()
    const { data: roleData } = await authClient.organization.getActiveMemberRole()
    memberRole.value = roleData?.role ?? null
    if (member?.organizationId) {
      // Fetch organization details using organizationId
      const organization = await $fetch<Organization>(`/api/organizations/${member.organizationId}`)
      if (organization) {
        formState.id = organization.id
        formState.name = organization.name
        formState.slug = organization.slug
        formState.logo = organization.logo || ''
        originalSlug.value = organization.slug
        slugStatus.value = 'idle'
        slugMessage.value = ''
        selectedFile.value = null
      }
    }
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to load organization'
  } finally {
    loading.value = false
  }
}

const isOwner = computed(() => memberRole.value === 'owner')
const slugChanged = computed(() => normalizeSlug(formState.slug) !== normalizeSlug(originalSlug.value))

const checkSlugAvailability = async (slug: string, { updateStatus = true } = {}) => {
  if (!slug.trim() || !slugChanged.value) {
    if (updateStatus) {
      slugStatus.value = 'idle'
      slugMessage.value = ''
    }
    return true
  }

  if (updateStatus) {
    slugStatus.value = 'checking'
    slugMessage.value = ''
  }

  try {
    const { data } = await authClient.organization.checkSlug({ slug })
    const available = data?.status || false
    slugStatus.value = available ? 'available' : 'unavailable'
    slugMessage.value = available ? 'Slug is available' : 'Slug is already in use'
    return available
  } catch {
    return false
  }
}

const debouncedSlugCheck = useDebounceFn((slug: string) => {
  void checkSlugAvailability(slug)
}, 400)

watch(() => formState.slug, (newSlug) => {
  const normalized = normalizeSlug(newSlug)
  if (normalized !== newSlug) {
    formState.slug = normalized
    return
  }
  if (!slugChanged.value) {
    slugStatus.value = 'idle'
    slugMessage.value = ''
    return
  }

  debouncedSlugCheck(newSlug)
})

const updateOrganization = async (event: FormSubmitEvent<z.output<typeof formSchema.value>>) => {
  try {
    if (!isOwner.value) {
      error.value = 'Only organization owners can update organization details'
      return
    }

    updating.value = true
    error.value = ''

    if (slugChanged.value) {
      const available = await checkSlugAvailability(event.data.slug, { updateStatus: false })
      if (!available) {
        error.value = 'Organization slug is already taken'
        return
      }
    }

    let logoUrl = event.data.logo ?? ''
    if (selectedFile.value) {
      const reader = new FileReader()
      logoUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(selectedFile.value!)
      })
    }

    await authClient.organization.update({
      organizationId: formState.id,
      data: {
        name: event.data.name,
        slug: event.data.slug,
        logo: logoUrl
      }
    })
    // Show success message
    error.value = ''
    originalSlug.value = event.data.slug
    slugStatus.value = 'idle'
    slugMessage.value = ''
    selectedFile.value = null
    emit('updated')
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to update organization'
  } finally {
    updating.value = false
  }
}

function onLogoFileChange(e: Event) {
  const input = e.target as HTMLInputElement

  if (!input.files?.length) {
    return
  }

  const file = input.files[0]!

  if (formState.logo && formState.logo.startsWith('blob:')) {
    URL.revokeObjectURL(formState.logo)
  }

  selectedFile.value = file
  formState.logo = URL.createObjectURL(file)
}

function onLogoFileClick() {
  fileRef.value?.click()
}

onUnmounted(() => {
  if (formState.logo && formState.logo.startsWith('blob:')) {
    URL.revokeObjectURL(formState.logo)
  }
})

const deleteOrganization = async () => {
  if (!confirm('Are you sure you want to delete this organization?')) return

  try {
    await authClient.organization.delete({
      organizationId: formState.id
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

<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
      <p class="text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
    </div>

    <UAlert v-else-if="error" color="error" variant="soft" :title="error" />

    <UForm v-else class="space-y-4" :state="formState" :schema="formSchema" @submit="updateOrganization">
      <UAlert v-if="!isOwner" color="warning" variant="soft" title="Only organization owners can edit name or slug." />
      <UFormField name="name" label="Organization Name" required>
        <UInput v-model="formState.name" type="text" placeholder="Organization name" required :disabled="!isOwner"
          class="w-full" />
      </UFormField>

      <UFormField name="slug" label="Organization Slug" required>
        <UInput v-model="formState.slug" type="text" placeholder="organization-slug" required :disabled="!isOwner"
          class="w-full" />
        <template #hint>
          <div class="flex flex-col gap-1">
            <span>URL-friendly identifier for your organization</span>
            <span v-if="slugStatus === 'checking'" class="text-sm text-gray-500">Checking availability...</span>
            <span v-else-if="slugStatus === 'available'" class="text-sm text-green-600">{{ slugMessage }}</span>
            <span v-else-if="slugStatus === 'unavailable'" class="text-sm text-red-600">{{ slugMessage }}</span>
            <span v-else-if="slugStatus === 'error'" class="text-sm text-red-600">{{ slugMessage }}</span>
          </div>
        </template>
      </UFormField>

      <UFormField name="logo" label="Organization Logo">
        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <div
              class="flex items-center justify-center w-28 h-16 rounded-md ring-2 ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
              <img v-if="formState.logo" :src="formState.logo" :alt="formState.name || 'Organization'"
                class="w-full h-full object-contain">
              <span v-else class="text-sm font-semibold text-gray-500">
                {{ formState.name ? formState.name.charAt(0).toUpperCase() : 'O' }}
              </span>
            </div>
            <UButton label="Choose logo" color="primary" variant="outline" :disabled="!isOwner"
              @click="onLogoFileClick" />
            <input ref="fileRef" type="file" class="hidden" accept=".jpg, .jpeg, .png, .gif" @change="onLogoFileChange">
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Upload a PNG, JPG, or GIF. Recommended size: 280×160.
          </p>
        </div>
      </UFormField>
      <!-- Form Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <UButton type="button" variant="ghost" color="neutral"  @click="emit('canceled')">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="updating" :disabled="updating || !isOwner || (slugChanged && slugStatus !== 'available')">
          {{ $t('common.save') }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>
