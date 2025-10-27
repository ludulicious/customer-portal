<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { signIn, authClient } from '@@/lib/auth-client'
import { ProseP } from '#components'

definePageMeta({
  layout: 'auth',
  meta: {
    public: true
  }
})

const { t } = useI18n()

useSeoMeta({
  title: t('login.title'),
  description: t('login.title')
})

const toast = useToast()
const router = useRouter()
const route = useRoute()
const fields = computed(() => [{
  name: 'email',
  type: 'text' as const,
  label: t('login.fields.email'),
  placeholder: t('login.fields.emailPlaceholder'),
  required: true
}, {
  name: 'password',
  label: t('login.fields.password'),
  type: 'password' as const,
  placeholder: t('login.fields.passwordPlaceholder')
}, {
  name: 'remember',
  label: t('login.fields.remember'),
  type: 'checkbox' as const
}])

const providers = computed(() => [{
  label: t('login.providers.google'),
  icon: 'i-simple-icons-google',
  onClick: () => {
    toast.add({ title: t('login.providers.google'), description: t('login.providers.googleDescription') })
  }
}, {
  label: t('login.providers.github'),
  icon: 'i-simple-icons-github',
  onClick: async () => {
    await handleGitHubLogin()
  }
}])

const schema = computed(() => z.object({
  email: z.email(t('login.validation.invalidEmail')),
  password: z.string().min(8, t('login.validation.passwordMinLength'))
}))

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
type Schema = {
  email: string
  password: string
  remember?: boolean
}

const onSubmit = async (payload: FormSubmitEvent<Schema>) => {
  console.log('Submitted', payload)

  loading.value = true
  try {
    await signIn.email(
      {
        email: payload.data.email,
        password: payload.data.password,
      },
      {
        onRequest: () => {
          loading.value = true
          errorMessage.value = null
        },
        onResponse: (ctx) => {
          // Typically handled by onError or onSuccess
        },
        onSuccess: async (ctx) => {
          console.log(
            'Credentials login success, redirecting to dashboard.',
            ctx,
          )
          successMessage.value = t('login.success')
          // Wait for session to be established and propagated
          await new Promise(resolve => setTimeout(resolve, 300))
          // Force refresh the session to ensure it's available
          await authClient.getSession()
          // Use window.location for a full page refresh to ensure session state is properly loaded
          const redirectTo = route.query.redirect?.toString() || '/dashboard'
          const localePath = useLocalePath()
          const fullPath = localePath(redirectTo)
          window.location.href = fullPath
        },
        onError: (ctx) => {
          const error = ctx.error
          console.error('Credentials login error:', error)

          // Check if the error indicates email needs verification
          if (error?.message?.includes('Email not verified')) {
            // Redirect to OTP verification page with login context
            const redirectTo = route.query.redirect?.toString() || '/dashboard'
            router.push(
              `/verify-email?email=${encodeURIComponent(payload.data.email)}&redirect=${encodeURIComponent(redirectTo)}&from=login`,
            )
          } else {
            errorMessage.value = error?.message || t('login.errors.invalidCredentials')
          }
          loading.value = false
        },
      },
    )
  } catch (error) {
    console.error('Unexpected login error:', error)
    errorMessage.value = t('login.errors.unexpectedError')
  }
  finally {
    loading.value = false
  }
}

const handleGitHubLogin = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    const redirectTo = route.query.redirect?.toString() || '/dashboard'
    await signIn.social({ provider: 'github', callbackURL: redirectTo })
  } catch (error) {
    console.error('GitHub sign in initiation failed:', error)
    errorMessage.value = t('login.errors.githubError')
    loading.value = false
  }
}
</script>

<template>
  <UAlert v-if="successMessage" color="success" variant="soft" :description="successMessage" />
  <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
  <UAuthForm :fields="fields" :schema="schema" :providers="providers" :title="t('login.title')" icon="i-lucide-lock"
    @submit="onSubmit">
    <template #description>
      {{ t('login.description') }} <ULink to="/signup" class="text-primary font-medium">{{ t('login.signupLink') }}
      </ULink>.
    </template>

    <template #password-hint>
      <ULink :to="$localePath('/forgot-password')" class="text-primary font-medium" tabindex="-1">{{
        t('login.forgotPassword') }}</ULink>
    </template>

    <template #footer>
      {{ t('login.footer') }} <ULink to="/" class="text-primary font-medium">{{ t('login.termsLink') }}</ULink>.
    </template>
  </UAuthForm>
</template>
