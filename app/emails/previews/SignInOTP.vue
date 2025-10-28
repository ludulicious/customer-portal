<template>
  <SignInOTP
    subject="Your Apex Pro sign-in code"
    greeting="Hello,"
    bodyText="Your verification code is: 789012"
    otp="789012"
    footerText="This code will expire soon. If you did not request this, please ignore this email."
  />
</template>

<script setup lang="ts">
import SignInOTP from '../SignInOTP.vue'
</script>
