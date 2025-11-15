<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '~/utils/auth-client'
import type { ApiError } from '~~/shared/types'

definePageMeta({
  layout: 'auth',
  public: true
})

const { t } = useI18n()

useSeoMeta({
  title: t('signup.title'),
  description: t('signup.title')
})

const toast = useToast()

const fields = computed(() => [{
  name: 'name',
  type: 'text' as const,
  label: t('signup.fields.name'),
  placeholder: t('signup.fields.namePlaceholder')
}, {
  name: 'email',
  type: 'text' as const,
  label: t('signup.fields.email'),
  placeholder: t('signup.fields.emailPlaceholder')
}, {
  name: 'password',
  label: t('signup.fields.password'),
  type: 'password' as const,
  placeholder: t('signup.fields.passwordPlaceholder')
}])

const providers = computed(() => [{
  label: t('signup.providers.google'),
  icon: 'i-simple-icons-google',
  onClick: () => {
    toast.add({ title: t('signup.providers.google'), description: t('signup.providers.googleDescription') })
  }
}, {
  label: t('signup.providers.github'),
  icon: 'i-simple-icons-github',
  onClick: () => {
    toast.add({ title: t('signup.providers.github'), description: t('signup.providers.githubDescription') })
  }
}])

const schema = computed(() => z.object({
  name: z.string().min(1, t('signup.validation.nameRequired')),
  email: z.email(t('signup.validation.invalidEmail')),
  password: z.string().min(8, t('signup.validation.passwordMinLength'))
}))

type Schema = {
  name: string
  email: string
  password: string
}

const route = useRoute()
const error = ref<string | null>(null)
const isLoading = ref(false)
const invitationId = ref<string | null>(null)
const invitationInfo = ref<{ organizationName?: string; role?: string } | null>(null)

// Check for invitation ID in query parameters
onMounted(() => {
  const invId = route.query.invitationId as string | undefined
  if (invId) {
    invitationId.value = invId
    // Store in localStorage for use after email verification
    if (process.client) {
      localStorage.setItem('pendingInvitationId', invId)
      // Try to fetch invitation details to show context
      fetchInvitationDetails(invId)
    }
  }
})

const fetchInvitationDetails = async (id: string) => {
  try {
    const { data } = await authClient.organization.getInvitation({ id })
    if (data) {
      invitationInfo.value = {
        organizationName: data.organization?.name,
        role: data.role
      }
    }
  } catch (err) {
    console.error('Failed to fetch invitation details:', err)
  }
}

const onSubmit = async (payload: FormSubmitEvent<Schema>) => {
  console.log('Submitted', payload)
  error.value = null
  isLoading.value = true
  
  // Store invitation ID if present
  const invId = route.query.invitationId as string | undefined
  if (invId && process.client) {
    localStorage.setItem('pendingInvitationId', invId)
  }
  
  try {
    const response = await authClient.signUp.email({
      name: payload.data.name,
      email: payload.data.email,
      password: payload.data.password
    })
    if (response.error) {
      const errorMessage = response.error.message || t('signup.errors.unknownError')
      error.value = errorMessage
      toast.add({ title: t('signup.errors.errorTitle'), description: errorMessage, color: 'error' })
    } else {
      // Redirect to OTP verification page with email parameter and invitation ID if present
      const verifyUrl = `/verify-email?email=${encodeURIComponent(payload.data.email)}${invId ? `&invitationId=${encodeURIComponent(invId)}` : ''}`
      navigateTo(verifyUrl)
    }
  } catch (err) {
    console.error('Email signup failed:', err)
    const apiError = err as ApiError
    const errorMessage = apiError.message || t('signup.errors.unknownError')
    error.value = errorMessage
    toast.add({ title: t('signup.errors.errorTitle'), description: errorMessage, color: 'error' })
  } finally {
    isLoading.value = false
  }
}

</script>

<template>
  <div>
    <!-- Company Logo -->
    <div class="flex justify-center mb-8">
      <AppLogo class="w-auto h-8 shrink-0" />
    </div>

    <!-- Invitation Alert -->
    <UAlert
      v-if="invitationInfo"
      color="primary"
      variant="soft"
      :title="t('signup.invitation.title', { organizationName: invitationInfo.organizationName })"
      :description="t('signup.invitation.description', { role: invitationInfo.role || 'member' })"
      class="mb-4"
    />

    <UAuthForm :fields="fields" :schema="schema" :providers="providers" :title="t('signup.title')"
      :submit="{ label: t('signup.submitButton') }" @submit="onSubmit">
      <template #description>
        {{ t('signup.description') }} <ULink to="/login" class="text-primary font-medium">{{ t('signup.loginLink') }}
        </ULink>.
      </template>

      <template #footer>
        {{ t('signup.footer') }} <ULink to="/" class="text-primary font-medium">{{ t('signup.termsLink') }}</ULink>.
      </template>
    </UAuthForm>
  </div>
</template>
