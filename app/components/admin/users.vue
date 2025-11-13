<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, SelectItem, TableColumn } from '@nuxt/ui'
import type { AdminUsersResponse, AdminUserResponse, UpdateUserRoleRequest, UpdateUserRoleResponse, ApiError, UserRole, UserSession } from '#types'
import { authClient } from '~/utils/auth-client'

const userStore = useUserStore()
const { isAdmin, currentUser, currentSessionId, currentSessionToken } = storeToRefs(userStore)
const { t, locale } = useI18n()
const toast = useToast()

// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: t('admin.errors.accessRequired') })
}

const loading = ref(true)
const error = ref('')
const users = ref<AdminUserResponse[]>([])
const searchQuery = ref('')
const editingUserId = ref<string | null>(null)
const editingRole = ref<UserRole>('user')
const updating = ref(false)

// Modal states
const showBanModal = ref(false)
const showUnbanModal = ref(false)
const showImpersonateModal = ref(false)
const showSessionsModal = ref(false)
const showPasswordModal = ref(false)
const showUpdateModal = ref(false)

// Selected user for operations
const selectedUser = ref<AdminUserResponse | null>(null)

// Ban form schema
const banSchema = computed(() => z.object({
  reason: z.string().optional(),
  expiresInDays: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined
    const num = typeof val === 'string' ? parseInt(val, 10) : Number(val)
    return isNaN(num) ? undefined : num
  }).optional(),
  expiresInHours: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined
    const num = typeof val === 'string' ? parseInt(val, 10) : Number(val)
    return isNaN(num) ? undefined : num
  }).optional(),
  expiresInMinutes: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined
    const num = typeof val === 'string' ? parseInt(val, 10) : Number(val)
    return isNaN(num) ? undefined : num
  }).optional()
}))

type BanSchema = z.input<typeof banSchema.value>

// Ban form state
const banForm = reactive<BanSchema>({
  reason: '',
  expiresInDays: '',
  expiresInHours: '',
  expiresInMinutes: ''
})

// Password form schema
const passwordSchema = computed(() => z.object({
  newPassword: z.string().min(8, t('login.validation.passwordMinLength'))
}))

type PasswordSchema = z.output<typeof passwordSchema.value>

// Password form state
const passwordForm = reactive<PasswordSchema>({
  newPassword: ''
})

// Update form schema
const updateSchema = computed(() => z.object({
  name: z.string().trim().min(1, t('profile.validation.nameRequired')).max(255, t('profile.validation.nameMaxLength')).optional(),
  image: z.union([
    z.string().url(t('profile.validation.imageInvalidUrl')),
    z.literal('').transform(() => null),
    z.null()
  ]).optional()
}).refine(
  (data) => data.name !== undefined || data.image !== undefined,
  {
    message: t('profile.validation.atLeastOneField')
  }
))

type UpdateSchema = z.output<typeof updateSchema.value>

// Update form state
const updateForm = reactive<Partial<UpdateSchema>>({
  name: '',
  image: ''
})

// Sessions state
const sessions = ref<UserSession[]>([])
const loadingSessions = ref(false)
const revokingSession = ref<string | null>(null)

// Impersonation state
const { data: currentSession } = await authClient.useSession(useFetch)
const isImpersonating = computed(() => !!currentSession.value?.session?.impersonatedBy)

// Fetch session data when component loads
await userStore.fetchCurrentSession()

const loadUsers = async () => {
  try {
    loading.value = true
    const params: Record<string, string> = {}
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    users.value = await $fetch<AdminUsersResponse>('/api/admin/users', {
      query: params
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.errors.failedToLoadUsers')
  } finally {
    loading.value = false
  }
}

// Debounced search function
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    loadUsers()
  }, 300) // 300ms debounce
}

// Watch for search query changes to handle clearing
watch(searchQuery, (newValue) => {
  if (!newValue || newValue.trim() === '') {
    // Clear search immediately when input is cleared
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    loadUsers()
  } else {
    handleSearch()
  }
})

// Cleanup timeout on unmount
onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})

await loadUsers()

const startEditRole = (user: AdminUserResponse) => {
  // Prevent editing current user's role
  if (currentUser.value && currentUser.value.id === user.id) {
    toast.add({
      title: t('common.error'),
      description: t('admin.errors.cannotChangeOwnRole'),
      color: 'error'
    })
    return
  }

  editingUserId.value = user.id
  editingRole.value = (user.role || 'user') as UserRole
}

const cancelEdit = () => {
  editingUserId.value = null
}

const updateUserRole = async (userId: string) => {
  // Prevent changing current user's role (safety check)
  if (currentUser.value && currentUser.value.id === userId) {
    toast.add({
      title: t('common.error'),
      description: t('admin.errors.cannotChangeOwnRole'),
      color: 'error'
    })
    editingUserId.value = null
    return
  }

  try {
    updating.value = true
    await $fetch<UpdateUserRoleResponse>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: { role: editingRole.value } satisfies UpdateUserRoleRequest
    })
    await loadUsers()
    editingUserId.value = null
    toast.add({
      title: t('common.success'),
      description: t('admin.errors.failedToUpdateRole'),
      color: 'success'
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.errors.failedToUpdateRole')
    toast.add({
      title: t('common.error'),
      description: error.value,
      color: 'error'
    })
  } finally {
    updating.value = false
  }
}

// Ban user
const openBanModal = (user: AdminUserResponse) => {
  // Prevent banning admin users
  if (user.role === 'admin') {
    toast.add({
      title: t('common.error'),
      description: t('admin.userManagement.ban.cannotBanAdmin'),
      color: 'error'
    })
    return
  }

  selectedUser.value = user
  banForm.reason = user.banReason || ''
  banForm.expiresInDays = ''
  banForm.expiresInHours = ''
  banForm.expiresInMinutes = ''
  showBanModal.value = true
}

const handleBanSubmit = async (event: FormSubmitEvent<z.output<typeof banSchema.value>>) => {
  if (!selectedUser.value) return

  // Prevent banning admin users (safety check)
  if (selectedUser.value.role === 'admin') {
    toast.add({
      title: t('common.error'),
      description: t('admin.userManagement.ban.cannotBanAdmin'),
      color: 'error'
    })
    showBanModal.value = false
    return
  }

  try {
    let banExpiresIn: number | undefined
    const days = event.data.expiresInDays ?? 0
    const hours = event.data.expiresInHours ?? 0
    const minutes = event.data.expiresInMinutes ?? 0

    if (days > 0 || hours > 0 || minutes > 0) {
      banExpiresIn = (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60)
    }

    const { error: banError } = await authClient.admin.banUser({
      userId: selectedUser.value.id,
      banReason: event.data.reason || undefined,
      banExpiresIn: banExpiresIn
    })

    if (banError) {
      throw banError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.userManagement.ban.success'),
      color: 'success'
    })
    showBanModal.value = false
    await loadUsers()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.userManagement.ban.error')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  }
}

// Unban user
const openUnbanModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  showUnbanModal.value = true
}

const unbanUser = async () => {
  if (!selectedUser.value) return

  try {
    const { error: unbanError } = await authClient.admin.unbanUser({
      userId: selectedUser.value.id
    })

    if (unbanError) {
      throw unbanError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.userManagement.unban.success'),
      color: 'success'
    })
    showUnbanModal.value = false
    await loadUsers()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.userManagement.unban.error')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  }
}

// Impersonate user
const openImpersonateModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  showImpersonateModal.value = true
}

const impersonateUser = async () => {
  if (!selectedUser.value) return

  try {
    const { error: impersonateError } = await authClient.admin.impersonateUser({
      userId: selectedUser.value.id
    })

    if (impersonateError) {
      throw impersonateError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.userManagement.impersonate.success'),
      color: 'success'
    })
    showImpersonateModal.value = false
    // Reload page to reflect impersonation state
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.userManagement.impersonate.error')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  }
}

const stopImpersonating = async () => {
  try {
    await authClient.admin.stopImpersonating()
    toast.add({
      title: t('common.success'),
      description: t('admin.userManagement.impersonate.stopSuccess'),
      color: 'success'
    })
    await loadUsers()
    await navigateTo('/admin/users')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.userManagement.impersonate.stopError')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  }
}

// Sessions
const openSessionsModal = async (user: AdminUserResponse) => {
  selectedUser.value = user
  showSessionsModal.value = true
  // Refresh current session data before loading sessions
  await userStore.fetchCurrentSession()
  await loadUserSessions()
}

const loadUserSessions = async () => {
  if (!selectedUser.value) return

  try {
    loadingSessions.value = true
    const { data, error: sessionsError } = await authClient.admin.listUserSessions({
      userId: selectedUser.value.id
    })

    if (sessionsError) {
      throw sessionsError
    }

    sessions.value = (data?.sessions || data || []) as UserSession[]

    // Refresh current session data when loading sessions to ensure we have the latest token
    await userStore.fetchCurrentSession()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions'
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  } finally {
    loadingSessions.value = false
  }
}

const revokeSession = async (sessionToken: string) => {
  // Find the session being revoked
  const sessionToRevoke = sessions.value.find(s => s.token === sessionToken)

  // Prevent revoking current session
  if (sessionToRevoke && isCurrentSession(sessionToRevoke)) {
    toast.add({
      title: t('common.error'),
      description: t('admin.userManagement.sessions.cannotRevokeCurrentSession'),
      color: 'error'
    })
    return
  }

  try {
    revokingSession.value = sessionToken
    const { error: revokeError } = await authClient.admin.revokeUserSession({
      sessionToken
    })

    if (revokeError) {
      throw revokeError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.userManagement.sessions.revokeSuccess'),
      color: 'success'
    })
    await loadUserSessions()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.userManagement.sessions.revokeError')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  } finally {
    revokingSession.value = null
  }
}

const revokeAllSessions = async () => {
  if (!selectedUser.value) return

  // Prevent revoking all sessions if it includes the current session
  if (currentUser.value && currentUser.value.id === selectedUser.value.id && currentSessionToken.value) {
    toast.add({
      title: t('common.error'),
      description: t('admin.userManagement.sessions.cannotRevokeCurrentSession'),
      color: 'error'
    })
    return
  }

  try {
    revokingSession.value = 'all'
    const { error: revokeError } = await authClient.admin.revokeUserSessions({
      userId: selectedUser.value.id
    })

    if (revokeError) {
      throw revokeError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.userManagement.sessions.revokeAllSuccess'),
      color: 'success'
    })
    await loadUserSessions()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.userManagement.sessions.revokeError')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  } finally {
    revokingSession.value = null
  }
}

// Change password
const openPasswordModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  passwordForm.newPassword = ''
  showPasswordModal.value = true
}

const handlePasswordSubmit = async (event: FormSubmitEvent<PasswordSchema>) => {
  if (!selectedUser.value) return

  try {
    const { error: passwordError } = await authClient.admin.setUserPassword({
      userId: selectedUser.value.id,
      newPassword: event.data.newPassword
    })

    if (passwordError) {
      throw passwordError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.userManagement.password.success'),
      color: 'success'
    })
    showPasswordModal.value = false
    passwordForm.newPassword = ''
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.userManagement.password.error')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  }
}

// Update user
const openUpdateModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  updateForm.name = user.name || ''
  updateForm.image = user.image || ''
  showUpdateModal.value = true
}

const handleUpdateSubmit = async (event: FormSubmitEvent<UpdateSchema>) => {
  if (!selectedUser.value) return

  try {
    const updateData: Record<string, unknown> = {}
    if (event.data.name) updateData.name = event.data.name.trim()
    if (event.data.image !== undefined) updateData.image = event.data.image || null

    const { error: updateError } = await authClient.admin.updateUser({
      userId: selectedUser.value.id,
      data: updateData
    })

    if (updateError) {
      throw updateError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.userManagement.update.success'),
      color: 'success'
    })
    showUpdateModal.value = false
    await loadUsers()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.userManagement.update.error')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  }
}

const isSessionExpired = (expiresAt: Date | string) => {
  return new Date(expiresAt) < new Date()
}

const isCurrentSession = (session: UserSession): boolean => {
  // Only check if we're viewing the current user's sessions
  if (!currentUser.value || !selectedUser.value) return false
  if (currentUser.value.id !== selectedUser.value.id) return false

  // Get session ID and token from getSession() result
  const sessionId = currentSessionId.value
  const token = currentSessionToken.value

  // Check if session ID matches (most reliable)
  if (sessionId && session.id === sessionId) {
    return true
  }

  // Check if session token matches
  if (token && session.token === token) {
    return true
  }

  return false
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
  { accessorKey: 'banned', header: t('admin.userManagement.status.banned') },
  { accessorKey: 'emailVerified', header: t('admin.table.verified') },
  { accessorKey: 'createdAt', header: t('admin.table.created') },
  { accessorKey: 'actions', header: t('admin.table.actions') }
])

</script>

<template>
  <div>
    <!-- Impersonation Banner -->
    <UAlert
      v-if="isImpersonating"
      color="warning"
      variant="soft"
      :title="t('admin.userManagement.impersonate.indicator')"
      class="mb-4"
    >
      <template #actions>
        <UButton
          color="warning"
          variant="solid"
          @click="stopImpersonating"
        >
          {{ t('admin.userManagement.impersonate.stop') }}
        </UButton>
      </template>
    </UAlert>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">{{ t('admin.table.title') }}</h2>
          <UButton icon="i-lucide-refresh-cw" variant="outline" :loading="loading" @click="loadUsers">
            {{ t('admin.table.refresh') }}
          </UButton>
        </div>
      </template>

      <div class="mb-4">
        <UInput
          v-model="searchQuery"
          :placeholder="t('admin.table.searchPlaceholder')"
          icon="i-lucide-search"
          :loading="loading"
          class="w-full max-w-md"
        />
      </div>

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
            <UButton
              v-if="!currentUser || currentUser.id !== row.original.id"
              icon="i-lucide-pencil"
              size="xs"
              variant="ghost"
              @click="startEditRole(row.original)"
            />
          </div>
        </template>

        <template #banned-cell="{ row }">
          <UBadge :color="row.original.banned ? 'error' : 'success'" variant="soft">
            {{ row.original.banned ? t('admin.userManagement.status.banned') : t('admin.userManagement.status.notBanned') }}
          </UBadge>
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

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="[(() => {
            const items = []
            // Only show ban/unban option for non-admin users
            if (row.original.role !== 'admin') {
              items.push({
                label: row.original.banned ? t('admin.userManagement.actions.unban') : t('admin.userManagement.actions.ban'),
                icon: 'i-lucide-ban',
                onSelect: () => row.original.banned ? openUnbanModal(row.original) : openBanModal(row.original)
              })
            }
            items.push(
              { label: t('admin.userManagement.actions.impersonate'), icon: 'i-lucide-user-cog', onSelect: () => openImpersonateModal(row.original) },
              { label: t('admin.userManagement.actions.sessions'), icon: 'i-lucide-monitor', onSelect: () => openSessionsModal(row.original) },
              { label: t('admin.userManagement.actions.changePassword'), icon: 'i-lucide-key', onSelect: () => openPasswordModal(row.original) },
              { label: t('admin.userManagement.actions.update'), icon: 'i-lucide-edit', onSelect: () => openUpdateModal(row.original) }
            )
            return items
          })()]" :content="{ align: 'end' }">
            <UButton variant="ghost" size="sm" icon="i-lucide-more-vertical" />
          </UDropdownMenu>
        </template>
      </UTable>
    </UCard>

    <!-- Ban User Modal -->
    <UModal v-model:open="showBanModal" :title="t('admin.userManagement.ban.title')" :ui="{ footer: 'justify-end' }">
      <template #body>
        <UForm :state="banForm" :schema="banSchema" class="space-y-4" @submit="handleBanSubmit">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('admin.userManagement.ban.description') }}
          </p>

          <UFormField name="reason" :label="t('admin.userManagement.ban.reason')">
            <UTextarea
              v-model="banForm.reason"
              :placeholder="t('admin.userManagement.ban.reasonPlaceholder')"
              class="w-full"
            />
          </UFormField>

          <div>
            <label class="block text-sm font-medium mb-2">{{ t('admin.userManagement.ban.expiresIn') }}</label>
            <div class="flex gap-2">
              <UFormField name="expiresInDays" class="flex-1">
                <UInput
                  v-model="banForm.expiresInDays"
                  type="number"
                  :placeholder="t('admin.userManagement.ban.expiresInDays')"
                  min="0"
                />
              </UFormField>
              <UFormField name="expiresInHours" class="flex-1">
                <UInput
                  v-model="banForm.expiresInHours"
                  type="number"
                  :placeholder="t('admin.userManagement.ban.expiresInHours')"
                  min="0"
                />
              </UFormField>
              <UFormField name="expiresInMinutes" class="flex-1">
                <UInput
                  v-model="banForm.expiresInMinutes"
                  type="number"
                  :placeholder="t('admin.userManagement.ban.expiresInMinutes')"
                  min="0"
                />
              </UFormField>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ t('admin.userManagement.ban.never') }} - Leave all fields empty
            </p>
          </div>

          <div class="flex gap-4 justify-end pt-4">
            <UButton type="button" variant="outline" @click="showBanModal = false">
              {{ t('common.cancel') }}
            </UButton>
            <UButton type="submit" color="error">
              {{ t('admin.userManagement.ban.confirm') }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Unban User Modal -->
    <UModal v-model:open="showUnbanModal" :title="t('admin.userManagement.unban.title')" :ui="{ footer: 'justify-end' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('admin.userManagement.unban.description') }}
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-4 justify-end">
          <UButton variant="outline" @click="showUnbanModal = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton color="success" @click="unbanUser">
            {{ t('admin.userManagement.unban.confirm') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Impersonate User Modal -->
    <UModal v-model:open="showImpersonateModal" :title="t('admin.userManagement.impersonate.title')" :ui="{ footer: 'justify-end' }">
      <template #body>
        <div class="space-y-4">
          <UAlert color="warning" variant="soft" :title="t('admin.userManagement.impersonate.warning')" />
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('admin.userManagement.impersonate.description') }}
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-4 justify-end">
          <UButton variant="outline" @click="showImpersonateModal = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton color="warning" @click="impersonateUser">
            {{ t('admin.userManagement.impersonate.confirm') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Sessions Modal -->
    <UModal
      v-model:open="showSessionsModal"
      :title="t('admin.userManagement.sessions.title')"
      :description="t('admin.userManagement.sessions.description')"
      :ui="{ content: 'max-w-4xl', footer: 'justify-end' }"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <UButton
            v-if="currentUser && selectedUser && currentUser.id !== selectedUser.id"
            color="error"
            variant="outline"
            size="sm"
            :loading="revokingSession === 'all'"
            @click="revokeAllSessions"
          >
            {{ t('admin.userManagement.sessions.revokeAll') }}
          </UButton>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <div v-if="loadingSessions" class="text-center py-8">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p class="text-gray-600 dark:text-gray-400 mt-2">{{ t('common.loading') }}</p>
          </div>

          <div v-else-if="sessions.length === 0" class="text-center py-8">
            <p class="text-gray-600 dark:text-gray-400">{{ t('admin.userManagement.sessions.noSessions') }}</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="flex items-center justify-between p-4 border rounded-lg"
            >
              <div class="flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <UBadge :color="isSessionExpired(session.expiresAt) ? 'error' : 'success'" variant="soft" size="xs">
                    {{ isSessionExpired(session.expiresAt) ? t('admin.userManagement.sessions.expired') : t('admin.userManagement.sessions.active') }}
                  </UBadge>
                </div>
                <div class="text-sm">
                  <div><strong>{{ t('admin.userManagement.sessions.ipAddress') }}:</strong> {{ session.ipAddress || t('admin.table.notAvailable') }}</div>
                  <div><strong>{{ t('admin.userManagement.sessions.userAgent') }}:</strong> {{ session.userAgent || t('admin.table.notAvailable') }}</div>
                  <div><strong>{{ t('admin.userManagement.sessions.createdAt') }}:</strong> {{ new Date(session.createdAt).toLocaleString(locale) }}</div>
                  <div><strong>{{ t('admin.userManagement.sessions.expiresAt') }}:</strong> {{ new Date(session.expiresAt).toLocaleString(locale) }}</div>
                </div>
              </div>
              <template v-if="isCurrentSession(session)">
                <UBadge color="primary" variant="soft" size="sm">
                  {{ t('admin.userManagement.sessions.currentSession') }}
                </UBadge>
              </template>
              <UButton
                v-else-if="!isSessionExpired(session.expiresAt)"
                color="error"
                variant="outline"
                size="sm"
                :loading="revokingSession === session.token"
                @click="revokeSession(session.token)"
              >
                {{ t('admin.userManagement.sessions.revoke') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-4 justify-end">
          <UButton variant="outline" @click="showSessionsModal = false">
            {{ t('common.close') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Change Password Modal -->
    <UModal v-model:open="showPasswordModal" :title="t('admin.userManagement.password.title')" :ui="{ footer: 'justify-end' }">
      <template #body>
        <UForm :state="passwordForm" :schema="passwordSchema" class="space-y-4" @submit="handlePasswordSubmit">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('admin.userManagement.password.description') }}
          </p>

          <UFormField name="newPassword" :label="t('admin.userManagement.password.newPassword')" required>
            <UInput
              v-model="passwordForm.newPassword"
              type="password"
              :placeholder="t('admin.userManagement.password.newPasswordPlaceholder')"
              class="w-full"
            />
          </UFormField>

          <div class="flex gap-4 justify-end pt-4">
            <UButton type="button" variant="outline" @click="showPasswordModal = false">
              {{ t('common.cancel') }}
            </UButton>
            <UButton type="submit">
              {{ t('admin.userManagement.password.confirm') }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Update User Modal -->
    <UModal v-model:open="showUpdateModal" :title="t('admin.userManagement.update.title')" :ui="{ footer: 'justify-end' }">
      <template #body>
        <UForm :state="updateForm" :schema="updateSchema" class="space-y-4" @submit="handleUpdateSubmit">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('admin.userManagement.update.description') }}
          </p>

          <UFormField name="name" :label="t('admin.userManagement.update.name')">
            <UInput
              v-model="updateForm.name"
              :placeholder="t('admin.userManagement.update.name')"
              class="w-full"
            />
          </UFormField>

          <UFormField name="image" :label="t('admin.userManagement.update.image')">
            <UInput
              v-model="updateForm.image"
              :placeholder="t('admin.userManagement.update.imagePlaceholder')"
              class="w-full"
            />
          </UFormField>

          <div class="flex gap-4 justify-end pt-4">
            <UButton type="button" variant="outline" @click="showUpdateModal = false">
              {{ t('common.cancel') }}
            </UButton>
            <UButton type="submit">
              {{ t('admin.userManagement.update.confirm') }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
