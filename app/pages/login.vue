<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { signIn } from '@@/lib/auth-client'

definePageMeta({
  layout: 'auth',
  meta: {
    public: true
  }
})

useSeoMeta({
  title: 'Login',
  description: 'Login to your account to continue'
})

const toast = useToast()
const router = useRouter()
const route = useRoute()
const fields = [{
  name: 'email',
  type: 'text' as const,
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password' as const,
  placeholder: 'Enter your password'
}, {
  name: 'remember',
  label: 'Remember me',
  type: 'checkbox' as const
}]

const providers = [{
  label: 'Google',
  icon: 'i-simple-icons-google',
  onClick: () => {
    toast.add({ title: 'Google', description: 'Login with Google' })
  }
}, {
  label: 'GitHub',
  icon: 'i-simple-icons-github',
  onClick: async () => {
     await handleGitHubLogin()
  }
}]

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

const loading = ref(false)
const errorMessage = ref<string | null>(null)

type Schema = z.output<typeof schema>

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
        onSuccess: (ctx) => {
          console.log(
            'Credentials login success, redirecting to dashboard.',
            ctx,
          )
          // Redirect to dashboard after successful login
          // Use replace: true to prevent going back to login page
          const redirectTo = route.query.redirect?.toString() || '/dashboard'
          router.push({ path: redirectTo, replace: true })
        },
        onError: (ctx) => {
          const error = ctx.error
          console.error('Credentials login error:', error)

          // Check if the error indicates email needs verification
          // (Exact error message/code might depend on better-auth version)
          if (error?.message?.includes('Email not verified')) {
            // Adjust check as needed
            router.push(
              `/resend-verification?email=${encodeURIComponent(payload.data.email)}`,
            )
          } else {
            errorMessage.value = error?.message || 'Invalid email or password.'
          }
          loading.value = false
        },
      },
    )
  } catch (error) {
    console.error('Unexpected login error:', error)
    errorMessage.value = 'An unexpected error occurred. Please try again.'
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
    errorMessage.value = 'Could not initiate GitHub login.'
    loading.value = false
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :providers="providers"
    title="Welcome back"
    icon="i-lucide-lock"
    @submit="onSubmit"
  >
    <template #description>
      Don't have an account? <ULink
        to="/signup"
        class="text-primary font-medium"
      >Sign up</ULink>.
    </template>

    <template #password-hint>
      <ULink
        to="/"
        class="text-primary font-medium"
        tabindex="-1"
      >Forgot password?</ULink>
    </template>

    <template #footer>
      By signing in, you agree to our <ULink
        to="/"
        class="text-primary font-medium"
      >Terms of Service</ULink>.
    </template>
  </UAuthForm>
</template>
