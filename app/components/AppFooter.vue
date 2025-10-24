<script setup lang="ts">
const { t } = useI18n()

const toast = useToast()

const email = ref('')
const loading = ref(false)

function onSubmit() {
  loading.value = true

  toast.add({
    title: 'Subscribed!',
    description: 'You\'ve been subscribed to our newsletter.'
  })
}
</script>

<template>
  <USeparator
    class="h-px"
  />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #left>
      <p class="text-muted text-sm">
        © Ludulicious {{ new Date().getFullYear() }}. {{ t('footer.copyright') }}
      </p>
    </template>

  </UFooter>
</template>
