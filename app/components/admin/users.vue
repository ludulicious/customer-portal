<script setup lang="ts">
import type { AdminUsersResponse, AdminUserResponse, UpdateUserRoleRequest, UpdateUserRoleResponse, ApiError, UserRole } from '~~/types'

const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)

// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Admin access required' })
}

const loading = ref(true)
const error = ref('')
const users = ref<AdminUsersResponse>([])
const editingUserId = ref<string | null>(null)
const editingRole = ref<UserRole>('user')
const updating = ref(false)

const loadUsers = async () => {
  try {
    loading.value = true
    users.value = await $fetch<AdminUsersResponse>('/api/admin/users')
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

const startEditRole = (user: AdminUserResponse) => {
  editingUserId.value = user.id
  editingRole.value = (user.role || 'user') as UserRole
}

const cancelEdit = () => {
  editingUserId.value = null
}

const updateUserRole = async (userId: string) => {
  try {
    updating.value = true
    await $fetch<UpdateUserRoleResponse>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: { role: editingRole.value } satisfies UpdateUserRoleRequest
    })
    await loadUsers()
    editingUserId.value = null
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to update user role'
  } finally {
    updating.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">All Users</h2>
        <UButton
          icon="i-lucide-refresh-cw"
          variant="outline"
          @click="loadUsers"
          :loading="loading"
        >
          Refresh
        </UButton>
      </div>
    </template>

    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
      <p class="text-gray-600 dark:text-gray-400 mt-2">Loading users...</p>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="error"
    />

    <div v-else-if="users.length === 0" class="text-center py-8">
      <p class="text-gray-600 dark:text-gray-400">No users found</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left p-4 font-semibold">Name</th>
            <th class="text-left p-4 font-semibold">Email</th>
            <th class="text-left p-4 font-semibold">Role</th>
            <th class="text-left p-4 font-semibold">Verified</th>
            <th class="text-left p-4 font-semibold">Created</th>
            <th class="text-left p-4 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="p-4">{{ user.name || 'N/A' }}</td>
            <td class="p-4">{{ user.email }}</td>
            <td class="p-4">
              <div v-if="editingUserId === user.id" class="flex items-center gap-2">
                <USelect
                  v-model="editingRole"
                  :options="[
                    { label: 'User', value: 'user' },
                    { label: 'Admin', value: 'admin' }
                  ]"
                  option-attribute="label"
                  value-attribute="value"
                  size="sm"
                />
                <UButton
                  size="xs"
                  @click="updateUserRole(user.id)"
                  :loading="updating"
                >
                  Save
                </UButton>
                <UButton
                  size="xs"
                  variant="outline"
                  @click="cancelEdit"
                >
                  Cancel
                </UButton>
              </div>
              <div v-else class="flex items-center gap-2">
                <UBadge
                  :color="user.role === 'admin' ? 'primary' : 'neutral'"
                  variant="soft"
                >
                  {{ user.role || 'user' }}
                </UBadge>
                <UButton
                  icon="i-lucide-pencil"
                  size="xs"
                  variant="ghost"
                  @click="startEditRole(user)"
                />
              </div>
            </td>
            <td class="p-4">
              <UBadge
                :color="user.emailVerified ? 'success' : 'warning'"
                variant="soft"
              >
                {{ user.emailVerified ? 'Verified' : 'Pending' }}
              </UBadge>
            </td>
            <td class="p-4 text-sm text-gray-600 dark:text-gray-400">
              {{ new Date(user.createdAt).toLocaleDateString() }}
            </td>
            <td class="p-4">
              <UButton
                variant="ghost"
                size="sm"
                icon="i-lucide-eye"
              >
                View
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
