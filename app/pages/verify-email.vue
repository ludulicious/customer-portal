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

  // Only auto-send OTP for login verification, not signup verification
  // Signup verification already sends an OTP during the signup process
  const isLoginVerification = route.query.redirect || route.query.from === 'login'
  if (email.value && isLoginVerification) {
    console.log('Login verification detected, sending OTP...')
    // Reset cooldown to ensure resendCode can run
    resendCooldown.value = 0
    await resendCode()
  } else if (email.value) {
    console.log('Signup verification detected, starting cooldown timer...')
    // For signup verification, start the cooldown timer since an OTP was already sent
    // This prevents immediate resend after page load
    startCooldownTimer()
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
    console.log('Verification context:', { isLoginVerification, email: email.value, redirect: route.query.redirect })

    let result
    if (isLoginVerification) {
      // For login verification, use signIn.emailOtp (sign-in type OTP)
      console.log('Using signIn.emailOtp for login verification')
      result = await authClient.signIn.emailOtp({
        email: email.value,
        otp: otpCode.value
      })
      console.log('signIn.emailOtp result:', result)
    } else {
      // For signup verification, use verifyEmail (email-verification type OTP)
      console.log('Using verifyEmail for signup verification')
      result = await authClient.emailOtp.verifyEmail({
        email: email.value,
        otp: otpCode.value
      })
      console.log('verifyEmail result:', result)
    }

    // Check for success - signIn.emailOtp returns user data, verifyEmail fallback returns status
    const isSuccess = result.data?.user || (result.data as any)?.status === true

    console.log('Verification success check:', { isSuccess, hasUser: !!result.data?.user, hasStatus: !!(result.data as any)?.status })

    if (isSuccess) {
      success.value = t('verify.success')
      console.log('Verification successful, checking session...')

      // For signup verification, the user might not be signed in yet
      if (!isLoginVerification) {
        console.log('Signup verification successful, user may need to sign in')
        // Show a message and redirect to login
        success.value = t('verify.success') + ' Please sign in to continue.'
        await new Promise(resolve => setTimeout(resolve, 2000))
        const redirectTo = route.query.redirect as string || '/dashboard'
        const localePath = useLocalePath()
        const loginPath = localePath('/login')
        const fullPath = `${loginPath}?email=${encodeURIComponent(email.value)}&redirect=${encodeURIComponent(redirectTo)}`
        console.log('Redirecting to login:', fullPath)
        window.location.href = fullPath
        return
      }

      // For login verification, user should be signed in
      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if session is established
      try {
        const sessionCheck = await authClient.getSession()
        console.log('Session after verification:', sessionCheck)
      } catch (sessionError) {
        console.log('Session check error:', sessionError)
      }

      console.log('Redirecting...')
      // The user should now be automatically signed in after email verification
      // Use window.location for a full page refresh to ensure session state is updated
      const redirectTo = route.query.redirect as string || '/dashboard'
      const localePath = useLocalePath()
      const fullPath = localePath(redirectTo)
      console.log('Redirecting to:', fullPath)
      window.location.href = fullPath
    } else {
      console.log('Verification failed:', result.error)
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
  console.log('resendCode called, cooldown:', resendCooldown.value)
  if (resendCooldown.value > 0) {
    console.log('Cooldown active, skipping resend')
    return
  }

  console.log('Starting resend process...')
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
  layout: 'centerform',
  public: true,
})
</script>

<template>
  <CustomPageCard :title="$t('verify.title')"
  :description="$t('verify.subtitle', { email })" :success="success" :error="error">

    <div>
      <label for="otp" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {{ $t('verify.enterCode') }}
      </label>
      <input id="otp" v-model="otpCode" type="text" maxlength="6" inputmode="numeric" pattern="[0-9]*"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-center text-2xl font-mono tracking-widest"
        :placeholder="$t('verify.codePlaceholder')" :disabled="isLoading" @input="handleOtpInput" />
    </div>

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
  </CustomPageCard>
</template>
