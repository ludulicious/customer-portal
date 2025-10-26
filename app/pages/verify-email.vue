<script setup lang="ts">
import { authClient } from '@@/lib/auth-client'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const localePath = useLocalePath()

// Get email from query params or session and decode it
const email = ref(decodeURIComponent(route.query.email as string || ''))
const otpCode = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const resendCooldown = ref(0)
let cooldownTimer: NodeJS.Timeout | null = null

// Auto-focus the OTP input and send initial OTP
onMounted(async () => {
  const input = document.querySelector('input[type="text"]') as HTMLInputElement
  if (input) input.focus()
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

// Clean up timer on unmount
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})
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
    // For users who are verifying during login, we need to sign them in
    // Check if this is a login verification (has redirect param) or signup verification
    const isLoginVerification = route.query.redirect || route.query.from === 'login'

    let result
    if (isLoginVerification) {
      // Use signIn.emailOtp for login verification
      result = await authClient.signIn.emailOtp({
        email: email.value,
        otp: otpCode.value
      })
    } else {
      // Use verifyEmail for signup verification
      result = await authClient.emailOtp.verifyEmail({
        email: email.value,
        otp: otpCode.value
      })
    }

    // Check for success based on the method used
    const isSuccess = isLoginVerification
      ? result.data?.user // signIn.emailOtp returns user data
      : (result.data as any)?.status === true // verifyEmail returns status

    if (isSuccess) {
      success.value = t('verify.success')
      // The user should now be automatically signed in after email verification
      // Use window.location for a full page refresh to ensure session state is updated
      const redirectTo = route.query.redirect as string || '/dashboard'
      const localePath = useLocalePath()
      const fullPath = localePath(redirectTo)
      window.location.href = fullPath
    } else {
      error.value = result.error?.message as string || t('verify.invalidCode')
    }
  } catch (err: any) {
    error.value = err.message as string || t('verify.error')
  } finally {
    isLoading.value = false

  }
}

// Resend OTP code
const resendCode = async () => {
  if (resendCooldown.value > 0) return

  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    // Determine OTP type based on context
    const isLoginVerification = route.query.redirect || route.query.from === 'login'
    const otpType = isLoginVerification ? 'sign-in' : 'email-verification'

    await authClient.emailOtp.sendVerificationOtp({
      email: email.value,
      type: otpType
    }).then((result) => {
      if (result.data?.success) {
        success.value = t('verify.codeSent')
        // Start the cooldown timer after successful resend
        startCooldownTimer()
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
  public: true,
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {{ $t('verify.subtitle', { email }) }}
        </p>
      </div>

      <UCard class="mt-8">
        <div class="space-y-6">
          <!-- Success Message -->
          <UAlert v-if="success" color="success" variant="soft" :description="success" />

          <!-- Error Message -->
          <UAlert v-if="error" color="error" variant="soft"  :description="error" />

          <!-- OTP Input -->
          <div>
            <label for="otp" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('verify.enterCode') }}
            </label>
            <input id="otp" v-model="otpCode" type="text" maxlength="6" inputmode="numeric" pattern="[0-9]*"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-center text-2xl font-mono tracking-widest"
              :placeholder="$t('verify.codePlaceholder')" :disabled="isLoading" @input="handleOtpInput" />
          </div>

          <!-- Verify Button -->
          <UButton :loading="isLoading" :disabled="otpCode.length !== 6 || isLoading" color="primary" size="lg" block
            @click="verifyCode">
            {{ $t('verify.verifyButton') }}
          </UButton>

          <!-- Resend Code -->
          <div class="text-center">
            <UButton :disabled="resendCooldown > 0 || isLoading" variant="ghost" size="sm" @click="resendCode">
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
