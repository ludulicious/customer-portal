<script setup lang="ts">
const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)

// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Admin access required' })
}

const activeTab = ref<'organizations' | 'users'>('organizations')
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            Manage organizations and users
          </p>
        </div>

        <div class="space-y-6">
          <div class="border-b border-gray-200 dark:border-gray-700">
            <nav class="-mb-px flex gap-6">
              <button
                @click="activeTab = 'organizations'"
                :class="[
                  'py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'organizations'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                ]"
              >
                Organizations
              </button>
              <button
                @click="activeTab = 'users'"
                :class="[
                  'py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'users'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                ]"
              >
                Users
              </button>
            </nav>
          </div>

          <AdminOrganizations v-if="activeTab === 'organizations'" />
          <AdminUsers v-if="activeTab === 'users'" />
        </div>
      </div>
    </UContainer>
  </div>
</template>

