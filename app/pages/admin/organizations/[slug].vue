<script setup lang="ts">
import type { Organization, OrganizationInvitationsResponse, OrganizationMemberWithUser, ApiError } from '#types'
import AdminInviteOwnerModal from '~/components/admin/InviteOwnerModal.vue'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'

definePageMeta({
  layout: 'default'
})

const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)

// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Admin access required' })
}

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const slug = route.params.slug as string

const loading = ref(true)
const error = ref('')
const organization = ref<Organization | null>(null)
const members = ref<OrganizationMemberWithUser[]>([])
const invitations = ref<OrganizationInvitationsResponse>([])
const showInviteModal = ref(false)
const showResendModal = ref(false)
const showDeleteModal = ref(false)
const selectedInvitation = ref<{ id: string, email: string, role: string } | null>(null)
const deleteInvitationId = ref<string | null>(null)

// Load organization details
const loadOrganization = async () => {
  try {
    loading.value = true
    error.value = ''
    organization.value = await $fetch<Organization>(`/api/admin/organizations/by-slug/${slug}`)

    if (organization.value) {
      await loadMembers()
      await loadInvitations()
    }
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.organization.detail.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

// Load members
const loadMembers = async () => {
  if (!organization.value) return

  try {
    // Use admin API endpoint that bypasses membership check
    members.value = await $fetch<OrganizationMemberWithUser[]>(
      `/api/admin/organizations/${organization.value.id}/members`
    )
  } catch (err) {
    console.error('Failed to load members:', err)
    members.value = []
  }
}

// Load invitations
const loadInvitations = async () => {
  if (!organization.value) return

  try {
    // Use admin API endpoint that bypasses membership check
    invitations.value = await $fetch<OrganizationInvitationsResponse>(
      `/api/admin/organizations/${organization.value.id}/invitations`
    )
  } catch (err) {
    console.error('Failed to load invitations:', err)
    invitations.value = []
  }
}

// Handle invite success
const handleInviteSuccess = async () => {
  await loadInvitations()
}

// Open resend confirmation modal
const openResendModal = (invitationId: string, email: string, role: string) => {
  selectedInvitation.value = { id: invitationId, email, role }
  showResendModal.value = true
}

// Resend invitation (called after confirmation)
const handleResendInvitation = async () => {
  if (!organization.value || !selectedInvitation.value) return

  try {
    await $fetch(`/api/admin/organizations/${organization.value.id}/invitations/${selectedInvitation.value.id}/resend`, {
      method: 'POST'
    })
    await loadInvitations()
    toast.add({
      title: t('common.success'),
      description: t('admin.organization.detail.invitations.resendSuccess'),
      color: 'success'
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.organization.detail.errors.resendFailed')
    toast.add({
      title: t('common.error'),
      description: apiError.message || t('admin.organization.detail.errors.resendFailed'),
      color: 'error'
    })
  } finally {
    selectedInvitation.value = null
  }
}

// Open delete confirmation modal
const openDeleteModal = (invitationId: string) => {
  deleteInvitationId.value = invitationId
  showDeleteModal.value = true
}

// Delete invitation (called after confirmation)
const handleDeleteInvitation = async () => {
  if (!organization.value || !deleteInvitationId.value) return

  try {
    await $fetch(`/api/admin/organizations/${organization.value.id}/invitations/${deleteInvitationId.value}/delete`, {
      method: 'POST'
    })
    await loadInvitations()
    toast.add({
      title: t('common.success'),
      description: t('admin.organization.detail.invitations.deleteSuccess'),
      color: 'success'
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.organization.detail.errors.cancelFailed')
    toast.add({
      title: t('common.error'),
      description: apiError.message || t('admin.organization.detail.errors.cancelFailed'),
      color: 'error'
    })
  } finally {
    deleteInvitationId.value = null
  }
}

onMounted(() => {
  loadOrganization()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <!-- Back Button -->
      <div class="mb-4">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          size="sm"
          :to="'/admin/organizations'"
        >
          {{ t('admin.organization.detail.back') }}
        </UButton>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ t('admin.organization.detail.loading') }}
        </p>
      </div>

      <!-- Error State -->
      <UAlert v-else-if="error" color="error" variant="soft" :title="error" />

      <!-- Organization Details -->
      <div v-else-if="organization" class="space-y-6">
        <!-- Organization Info Card -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">{{ t('admin.organization.detail.title') }}</h2>
          </template>
          <div class="space-y-2">
            <div>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('admin.organization.detail.name') }}</span>
              <p class="font-semibold">{{ organization.name }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('admin.organization.detail.slug') }}</span>
              <p class="font-mono text-sm">{{ organization.slug }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('admin.organization.detail.created') }}</span>
              <p>{{ new Date(organization.createdAt).toLocaleDateString() }}</p>
            </div>
          </div>
        </UCard>

        <!-- Members Card -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold">{{ t('admin.organization.detail.members.title') }} ({{ members.length }})</h2>
            </div>
          </template>
          <div v-if="members.length === 0" class="text-center py-4 text-gray-600 dark:text-gray-400">
            {{ t('admin.organization.detail.members.empty') }}
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('admin.organization.detail.members.email') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('admin.organization.detail.members.name') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('admin.organization.detail.members.role') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="member in members" :key="member.id">
                  <td class="px-4 py-3 text-sm">{{ member.user.email }}</td>
                  <td class="px-4 py-3 text-sm">{{ member.user.name || t('admin.table.notAvailable') }}</td>
                  <td class="px-4 py-3 text-sm">
                        <UBadge :color="member.role === 'owner' ? 'primary' : 'neutral'">
                          {{ member.role }}
                        </UBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <!-- Invitations Card -->
        <UCard>
          <template #header>
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 class="text-xl font-semibold">{{ t('admin.organization.detail.invitations.title') }} ({{ invitations.length }})</h2>
              <UButton
                icon="i-lucide-user-plus"
                color="primary"
                class="w-full sm:w-auto"
                @click="showInviteModal = true"
              >
                {{ t('admin.organization.detail.invitations.inviteOwner') }}
              </UButton>
            </div>
          </template>
          <div v-if="invitations.length === 0" class="text-center py-4 text-gray-600 dark:text-gray-400">
            {{ t('admin.organization.detail.invitations.empty') }}
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('admin.organization.detail.invitations.email') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('admin.organization.detail.invitations.role') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('admin.organization.detail.invitations.status') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('admin.organization.detail.invitations.expires') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('admin.organization.detail.invitations.actions') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="invitation in invitations" :key="invitation.id">
                  <td class="px-4 py-3 text-sm">{{ invitation.email }}</td>
                  <td class="px-4 py-3 text-sm">
                    <UBadge color="primary">{{ invitation.role || 'member' }}</UBadge>
                  </td>
                  <td class="px-4 py-3 text-sm">
                        <UBadge :color="invitation.status === 'pending' ? 'warning' : 'neutral'">
                          {{ invitation.status }}
                        </UBadge>
                  </td>
                  <td class="px-4 py-3 text-sm">{{ new Date(invitation.expiresAt).toLocaleDateString() }}</td>
                  <td class="px-4 py-3 text-sm">
                    <div class="flex gap-2">
                      <UButton
                        icon="i-lucide-send"
                        variant="ghost"
                        size="sm"
                        @click="openResendModal(invitation.id, invitation.email, invitation.role || 'member')"
                      >
                        {{ t('admin.organization.detail.invitations.resend') }}
                      </UButton>
                          <UButton
                            icon="i-lucide-trash-2"
                            variant="ghost"
                            size="sm"
                            color="error"
                            @click="openDeleteModal(invitation.id)"
                          >
                            {{ t('admin.organization.detail.invitations.delete') }}
                          </UButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>

      <!-- Invite Owner Modal -->
      <AdminInviteOwnerModal
        v-if="showInviteModal && organization"
        v-model:open="showInviteModal"
        :organization-id="organization.id"
        @success="handleInviteSuccess"
      />

      <!-- Resend Invitation Confirmation Modal -->
      <ConfirmationModal
        v-if="showResendModal && selectedInvitation"
        v-model:open="showResendModal"
        title="admin.organization.detail.invitations.confirmResend.title"
        message="admin.organization.detail.invitations.confirmResend.message"
        :message-params="{ email: selectedInvitation.email, role: selectedInvitation.role }"
        confirm-text="admin.organization.detail.invitations.confirmResend.confirm"
        confirm-color="primary"
        @confirm="handleResendInvitation"
      />

      <!-- Delete Invitation Confirmation Modal -->
      <ConfirmationModal
        v-if="showDeleteModal"
        v-model:open="showDeleteModal"
        title="admin.organization.detail.invitations.confirmDelete.title"
        message="admin.organization.detail.invitations.confirmDelete.message"
        confirm-text="admin.organization.detail.invitations.confirmDelete.confirm"
        confirm-color="error"
        @confirm="handleDeleteInvitation"
      />
    </UContainer>
  </div>
</template>
