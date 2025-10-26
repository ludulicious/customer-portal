<template>
  <EmailVerificationOTP
    subject="Verify your Apex Pro email address"
    greeting="Hello,"
    bodyText="Your verification code is: 123456"
    otp="123456"
    footerText="This code will expire soon. If you did not request this, please ignore this email."
  />
</template>

<script setup lang="ts">
import EmailVerificationOTP from '../EmailVerificationOTP.vue'
</script>
