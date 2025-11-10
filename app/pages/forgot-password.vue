<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '~/utils/auth-client'

definePageMeta({
  layout: 'centerform',
  public: true,
})

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

useSeoMeta({
  title: t('forgotPassword.title'),
  description: t('forgotPassword.description')
})

// State management
const currentStep = ref(1) // 1: email entry, 2: OTP + password
const email = ref('')
const otpCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const resendCooldown = ref(0)
let cooldownTimer: NodeJS.Timeout | null = null

// Auto-focus email input on mount
onMounted(() => {
  const input = document.querySelector('input[type="email"]') as HTMLInputElement
  if (input) input.focus()
})

// Clean up timer on unmount
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})

// Start cooldown timer
const startCooldownTimer = () => {
  resendCooldown.value = 60
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(cooldownTimer!)
      cooldownTimer = null
    }
  }, 1000)
}

// Handle OTP input formatting (6 digits only)
const handleOtpInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '').slice(0, 6)
  otpCode.value = value
  target.value = value
}

// Email validation schema
const emailSchema = computed(() => z.object({
  email: z.email(t('forgotPassword.validation.invalidEmail'))
}))

// Password reset validation schema
const resetSchema = computed(() => z.object({
  otp: z.string().min(6, t('forgotPassword.validation.otpLength')),
  newPassword: z.string().min(8, t('forgotPassword.validation.passwordMinLength')),
  confirmPassword: z.string().min(8, t('forgotPassword.validation.passwordMinLength'))
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: t('forgotPassword.validation.passwordsMatch'),
  path: ['confirmPassword']
}))

// Step 1: Send verification code
const sendVerificationCode = async (payload: FormSubmitEvent<{ email: string }>) => {
  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: payload.data.email,
      type: 'forget-password'
    })

    if (result.data?.success) {
      email.value = payload.data.email
      currentStep.value = 2
      success.value = t('forgotPassword.messages.codeSent')
      startCooldownTimer()

      // Auto-focus OTP input
      await nextTick()
      const otpInput = document.querySelector('input[type="text"]') as HTMLInputElement
      if (otpInput) otpInput.focus()
    } else {
      error.value = result.error?.message || t('forgotPassword.messages.userNotFound')
    }
  } catch (err: any) {
    error.value = err.message || t('forgotPassword.messages.userNotFound')
  } finally {
    isLoading.value = false
  }
}

// Resend verification code
const resendCode = async () => {
  if (resendCooldown.value > 0) {
    return
  }

  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: email.value,
      type: 'forget-password'
    })

    if (result.data?.success) {
      success.value = t('forgotPassword.messages.codeSent')
      startCooldownTimer()
    } else {
      error.value = result.error?.message || t('forgotPassword.messages.resendError')
    }
  } catch (err: any) {
    error.value = err.message || t('forgotPassword.messages.resendError')
  } finally {
    isLoading.value = false
  }
}

// Step 2: Reset password with OTP
const resetPassword = async (payload: FormSubmitEvent<{ otp: string; newPassword: string; confirmPassword: string }>) => {
  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    const resetResult = await authClient.emailOtp.resetPassword({
      email: email.value,
      otp: payload.data.otp,
      password: payload.data.newPassword
    })

    if (resetResult.data?.success) {
      success.value = t('forgotPassword.messages.passwordReset')

      // Redirect to login after a short delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      router.push(localePath('/dashboard'))
    } else {
      console.error(resetResult.error)
      error.value = t('forgotPassword.messages.resetError')
    }
  } catch (err: any) {
    console.error('Error resetting password:', err)
    error.value = t('forgotPassword.messages.resetError')
  } finally {
    isLoading.value = false
  }
}

// Auto-submit when 6 digits are entered
watch(otpCode, async (newValue) => {
  if (newValue.length === 6 && currentStep.value === 2) {
    // Only auto-submit if passwords are also filled
    if (newPassword.value && confirmPassword.value) {
      const formData = {
        otp: newValue,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value
      }
      await resetPassword({ data: formData } as FormSubmitEvent<{ otp: string; newPassword: string; confirmPassword: string }>)
    }
  }
})
</script>

<template>
  <CustomPageCard :title="t('forgotPassword.title')"
    :description="currentStep === 1 ? t('forgotPassword.description') : t('forgotPassword.step2Description', { email })"
    :success="success" :error="error">
    <!-- Step 1: Email Entry -->
    <div v-if="currentStep === 1">
      <UForm :schema="emailSchema" :state="{ email }" class="space-y-4" @submit="sendVerificationCode">
        <UFormGroup :label="t('forgotPassword.fields.email')" name="email" required>
          <UInput class="mb-4 w-full" v-model="email" type="email"
            :placeholder="t('forgotPassword.fields.emailPlaceholder')" :disabled="isLoading" size="lg" />
        </UFormGroup>

        <UButton :loading="isLoading" :disabled="!email || isLoading" color="primary" size="lg" block type="submit">
          {{ t('forgotPassword.buttons.sendCode') }}
        </UButton>
      </UForm>
    </div>

    <!-- Step 2: OTP + Password Reset -->
    <div v-if="currentStep === 2" class="space-y-4">
      <UForm :schema="resetSchema" :state="{ otp: otpCode, newPassword, confirmPassword }" class="space-y-4"
        @submit="resetPassword">
        <!-- OTP Input -->
        <UFormGroup :label="t('forgotPassword.fields.otp')" name="otp" required>
          <input id="otp" v-model="otpCode" type="text" maxlength="6" inputmode="numeric" pattern="[0-9]*"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-center text-2xl font-mono tracking-widest"
            :placeholder="$t('verify.codePlaceholder')" :disabled="isLoading" @input="handleOtpInput" />
        </UFormGroup>
        <USeparator />
        <!-- New Password -->
        <UFormGroup :label="t('forgotPassword.fields.newPassword')" name="newPassword" required>
          <UInput class="mb-4 w-full" v-model="newPassword" type="password"
            :placeholder="t('forgotPassword.fields.newPasswordPlaceholder')" :disabled="isLoading" size="lg" />
        </UFormGroup>

        <!-- Confirm Password -->
        <UFormGroup :label="t('forgotPassword.fields.confirmPassword')" name="confirmPassword" required>
          <UInput class="mb-4 w-full" v-model="confirmPassword" type="password"
            :placeholder="t('forgotPassword.fields.confirmPasswordPlaceholder')" :disabled="isLoading" size="lg" />
        </UFormGroup>

        <UButton :loading="isLoading" :disabled="otpCode.length !== 6 || !newPassword || !confirmPassword || isLoading"
          color="primary" size="lg" block type="submit">
          {{ t('forgotPassword.buttons.resetPassword') }}
        </UButton>
      </UForm>

      <!-- Resend Code -->
      <div class="text-center">
        <UButton :disabled="resendCooldown > 0 || isLoading" variant="ghost" size="sm" @click="resendCode">
          {{ resendCooldown > 0 ? t('forgotPassword.messages.resendIn', { seconds: resendCooldown }) :
            t('forgotPassword.buttons.resendCode') }}
        </UButton>
      </div>
    </div>

    <!-- Back to Login -->
    <div class="text-center mt-10">
      <NuxtLink :to="localePath('/login')" class="text-sm text-primary hover:text-primary/80">
        {{ t('forgotPassword.buttons.backToLogin') }}
      </NuxtLink>
    </div>
  </CustomPageCard>
</template>
