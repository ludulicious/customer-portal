<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '@@/lib/auth-client'

definePageMeta({
  layout: 'auth',
  meta: {
    public: true
  }
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

const error = ref<string | null>(null)
const isLoading = ref(false)
const onSubmit = async (payload: FormSubmitEvent<Schema>) => {
  console.log('Submitted', payload)
  error.value = null
  isLoading.value = true
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
      navigateTo('/check-email')
    }
  } catch (err: any) {
    console.error('Email signup failed:', err)
    const errorMessage = err.message || t('signup.errors.unknownError')
    error.value = errorMessage
    toast.add({ title: t('signup.errors.errorTitle'), description: errorMessage, color: 'error' })
  } finally {
    isLoading.value = false
  }
}

</script>

<template>
  <UAuthForm :fields="fields" :schema="schema" :providers="providers" :title="t('signup.title')"
    :submit="{ label: t('signup.submitButton') }" @submit="onSubmit">
    <template #description>
      {{ t('signup.description') }} <ULink to="/login" class="text-primary font-medium">{{ t('signup.loginLink') }}</ULink>.
    </template>

    <template #footer>
      {{ t('signup.footer') }} <ULink to="/" class="text-primary font-medium">{{ t('signup.termsLink') }}</ULink>.
    </template>
  </UAuthForm>
</template>
