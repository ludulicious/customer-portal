<template>
  <BaseLayout :title="subject">
    <EText style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
      {{ greeting }}
    </EText>

    <EText style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
      {{ bodyText }}
    </EText>

    <EButton v-if="actionUrl"
      :href="actionUrl"
      style="background-color: #4CAF50; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; text-transform: uppercase; display: inline-block; margin: 20px 0;"
    >
      {{ actionText }}
    </EButton>

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
  actionUrl: string
  actionText: string
  footerText: string
  locale?: string
}

const props = withDefaults(defineProps<Props>(), {
  greeting: 'Hello,',
  locale: 'en'
})
</script>
