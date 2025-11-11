<script setup lang="ts">
const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)
const { t } = useI18n()
// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Admin access required' })
}
const route = useRoute()
type Tab = 'organizations' | 'users'
const tab = route.params.tab as Tab | undefined
const activeTab = ref<Tab>(tab || 'organizations')
const tabs = computed(() => [
  {
    value: 'organizations',
    label: t('admin.dashboard.organizations'),
  },
  {
    value: 'users',
    label: t('admin.dashboard.users'),
  }
])

watch(activeTab, (newTab) => {
  history.pushState(null, '', `/admin/${newTab}`)
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ t('admin.dashboard.title') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            {{ t('admin.dashboard.description') }}
          </p>
        </div>
        <UTabs v-model="activeTab" size="md" variant="link" :content="false" :items="tabs" class="w-full" />

        <div class="space-y-6">
          <AdminOrganizations v-if="activeTab === 'organizations'" />
          <AdminUsers v-if="activeTab === 'users'" />
        </div>
      </div>
    </UContainer>
  </div>
</template>
