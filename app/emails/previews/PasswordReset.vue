<template>
  <PasswordReset
    subject="Reset your Apex Pro password"
    greeting="Hello John,"
    bodyText="You requested a password reset for your Apex Pro account. Please click the button below to set a new password:"
    actionUrl="https://example.com/reset-password?token=abc123"
    actionText="Reset Password"
    footerText="If you didn't request a password reset, please ignore this email."
  />
</template>

<script setup lang="ts">
import PasswordReset from '../PasswordReset.vue'
</script>
