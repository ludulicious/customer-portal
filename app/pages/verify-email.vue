<script setup lang="ts">
import { authClient } from '@@/lib/auth-client'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const localePath = useLocalePath()

// Get email from query params or session
const email = ref(route.query.email as string || '')
const otpCode = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const resendCooldown = ref(60)

// Auto-focus the OTP input
onMounted(() => {
  const input = document.querySelector('input[type="text"]') as HTMLInputElement
  if (input) input.focus()
})


// Countdown timer
const timer = setInterval(() => {
  resendCooldown.value--
  if (resendCooldown.value <= 0) {
    clearInterval(timer)
  }
}, 1000)
// Handle OTP input formatting (6 digits only)
const handleOtpInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '').slice(0, 6)
  otpCode.value = value
  target.value = value
}

// Verify the OTP code
const verifyCode = async () => {
  if (otpCode.value.length !== 6) {
    error.value = t('verify.invalidCodeLength')
    return
  }

  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    const result = await authClient.emailOtp.verifyEmail({
      email: email.value,
      otp: otpCode.value
    })

    if (result.data?.status === true) {
      success.value = t('verify.success')
    } else {
      error.value = result.error?.message as string || t('verify.invalidCode')
    }
  } catch (err: any) {
    error.value = err.message as string || t('verify.error')
  } finally {
    isLoading.value = false
    // Redirect to dashboard or intended page
    const redirectTo = route.query.redirect as string || '/dashboard'
    await router.push(localePath(redirectTo))
  }
}

// Resend OTP code
const resendCode = async () => {
  if (resendCooldown.value > 0) return

  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    await authClient.emailOtp.sendVerificationOtp({
      email: email.value,
      type: 'email-verification'
    }).then((result) => {
      if (result.data?.success) {
        success.value = t('verify.codeSent')
      } else {
        error.value = result.error?.message || t('verify.resendError')
      }
    })
  } catch (err: any) {
    error.value = err.message || t('verify.resendError')
  } finally {
    isLoading.value = false
  }
}

// Auto-submit when 6 digits are entered
watch(otpCode, (newValue) => {
  if (newValue.length === 6) {
    verifyCode()
  }
})

definePageMeta({
  layout: 'auth',
  meta: {
    public: true
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {{ $t('verify.title') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {{ $t('verify.subtitle', { email }) }}
        </p>
      </div>

      <UCard class="mt-8">
        <div class="space-y-6">
          <!-- Success Message -->
          <UAlert v-if="success" color="success" variant="soft" :title="$t('verify.success')" :description="success" />

          <!-- Error Message -->
          <UAlert v-if="error" color="error" variant="soft" :title="$t('verify.error')" :description="error" />

          <!-- OTP Input -->
          <div>
            <label for="otp" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('verify.enterCode') }}
            </label>
            <input
              id="otp"
              v-model="otpCode"
              type="text"
              maxlength="6"
              inputmode="numeric"
              pattern="[0-9]*"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-center text-2xl font-mono tracking-widest"
              :placeholder="$t('verify.codePlaceholder')"
              :disabled="isLoading"
              @input="handleOtpInput"
            />
          </div>

          <!-- Verify Button -->
          <UButton
            :loading="isLoading"
            :disabled="otpCode.length !== 6 || isLoading"
            color="primary"
            size="lg"
            block
            @click="verifyCode"
          >
            {{ $t('verify.verifyButton') }}
          </UButton>

          <!-- Resend Code -->
          <div class="text-center">
            <UButton
              :disabled="resendCooldown > 0 || isLoading"
              variant="ghost"
              size="sm"
              @click="resendCode"
            >
              {{ resendCooldown > 0 ? $t('verify.resendIn', { seconds: resendCooldown }) : $t('verify.resendCode') }}
            </UButton>
          </div>

          <!-- Back to Login -->
          <div class="text-center">
            <NuxtLink :to="localePath('/login')" class="text-sm text-primary hover:text-primary/80">
              {{ $t('verify.backToLogin') }}
            </NuxtLink>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
