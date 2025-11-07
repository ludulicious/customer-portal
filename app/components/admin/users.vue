<script setup lang="ts">
import type { SelectItem, TableColumn } from '@nuxt/ui'
import type { AdminUsersResponse, AdminUserResponse, UpdateUserRoleRequest, UpdateUserRoleResponse, ApiError, UserRole } from '~~/types'

const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)
const { t, locale } = useI18n()

// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: t('admin.errors.accessRequired') })
}

const loading = ref(true)
const error = ref('')
const users = ref<AdminUserResponse[]>([])
const editingUserId = ref<string | null>(null)
const editingRole = ref<UserRole>('user')
const updating = ref(false)

const loadUsers = async () => {
  try {
    loading.value = true
    users.value = await $fetch<AdminUsersResponse>('/api/admin/users')
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.errors.failedToLoadUsers')
  } finally {
    loading.value = false
  }
}

await loadUsers()

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
    error.value = apiError.message || t('admin.errors.failedToUpdateRole')
  } finally {
    updating.value = false
  }
}

const roles = computed<SelectItem[]>(() => [
  {
    label: t('admin.roles.user'),
    value: 'user'
  },
  {
    label: t('admin.roles.admin'),
    value: 'admin'
  }
])

const columns = computed<TableColumn<AdminUserResponse>[]>(() => [
  { accessorKey: 'name', header: t('admin.table.name') },
  { accessorKey: 'email', header: t('admin.table.email') },
  { accessorKey: 'role', header: t('admin.table.role') },
  { accessorKey: 'emailVerified', header: t('admin.table.verified') },
  { accessorKey: 'createdAt', header: t('admin.table.created') },
  { accessorKey: 'actions', header: t('admin.table.actions') }
])

</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">{{ t('admin.table.title') }}</h2>
        <UButton icon="i-lucide-refresh-cw" variant="outline" :loading="loading" @click="loadUsers">
          {{ t('admin.table.refresh') }}
        </UButton>
      </div>
    </template>

    <UAlert v-if="error" color="error" variant="soft" :title="error" />

    <div v-else-if="users.length === 0" class="text-center py-8">
      <p class="text-gray-600 dark:text-gray-400">{{ t('admin.table.noUsersFound') }}</p>
    </div>

    <UTable
      v-else-if="users.length > 0"
      :data="users"
      :columns="columns"
      :loading="loading"
    >
      <template #name-cell="{ row }">
        {{ row.original.name || t('admin.table.notAvailable') }}
      </template>

      <template #role-cell="{ row }">
        <div v-if="editingUserId === row.original.id" class="flex items-center gap-2">
          <USelect v-model="editingRole" :items="roles" size="sm" class="w-32" />
          <UButton size="xs" :loading="updating" @click="updateUserRole(row.original.id)">
            {{ t('common.save') }}
          </UButton>
          <UButton size="xs" variant="outline" @click="cancelEdit">
            {{ t('common.cancel') }}
          </UButton>
        </div>
        <div v-else class="flex items-center gap-2">
          <UBadge :color="row.original.role === 'admin' ? 'primary' : 'neutral'" class="justify-center w-20" variant="soft">
            {{ row.original.role === 'admin' ? t('admin.roles.admin') : t('admin.roles.user') }}
          </UBadge>
          <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="startEditRole(row.original)" />
        </div>
      </template>

      <template #emailVerified-cell="{ row }">
        <UBadge :color="row.original.emailVerified ? 'success' : 'warning'" variant="soft">
          {{ row.original.emailVerified ? t('admin.verification.verified') : t('admin.verification.pending') }}
        </UBadge>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ new Date(row.original.createdAt).toLocaleDateString(locale) }}
        </span>
      </template>

      <template #actions-cell>
        <UButton variant="ghost" size="sm" icon="i-lucide-eye">
          {{ t('common.view') }}
        </UButton>
      </template>
    </UTable>
  </UCard>
</template>
