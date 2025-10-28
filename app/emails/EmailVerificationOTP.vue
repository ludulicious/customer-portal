<template>
  <BaseLayout :title="subject">
    <EText style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
      {{ greeting }}
    </EText>

    <EText style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
      {{ bodyText }}
    </EText>

    <!-- OTP Code Display -->
    <ERow>
      <EColumn>
        <EText align="center" style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; margin: 20px 0; padding: 20px; background-color: #f8f9fa; border: 2px dashed #4CAF50; border-radius: 8px;">
          {{ otp }}
        </EText>
      </EColumn>
    </ERow>

    <EText style="font-size: 14px; line-height: 1.6; color: #666; margin-top: 20px;">
      {{ footerText }}
    </EText>
  </BaseLayout>
</template>

<script setup lang="ts">
interface Props {
  subject: string
  greeting?: string
  bodyText: string
  otp: string
  footerText: string
  locale?: string
}

const props = withDefaults(defineProps<Props>(), {
  greeting: 'Hello,',
  locale: 'en'
})
</script>
