<script setup lang="ts">
import type { OrganizationInvitationsResponse, OrganizationMemberWithUser, ApiError } from '#types'
import { useOrganization } from '~/composables/useOrganization'
import OrganizationInviteMemberModal from '~/components/organization/InviteMemberModal.vue'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'

definePageMeta({
  layout: 'default'
})

const { t } = useI18n()
const toast = useToast()
const { getActiveMember, listMembers, inviteMember, isOrganizationOwner, listInvitations, resendInvitation, cancelInvitation } = useOrganization()

const loading = ref(true)
const error = ref('')
const organizationId = ref<string | null>(null)
const members = ref<OrganizationMemberWithUser[]>([])
const invitations = ref<OrganizationInvitationsResponse>([])
const showInviteModal = ref(false)
const showResendModal = ref(false)
const showDeleteModal = ref(false)
const selectedInvitation = ref<{ id: string; email: string; role: string } | null>(null)
const deleteInvitationId = ref<string | null>(null)
const isOwner = ref(false)

// Load organization and data
const loadData = async () => {
  try {
    loading.value = true
    error.value = ''

    // Get active organization
    const activeMember = await getActiveMember()
    if (!activeMember.data?.organizationId) {
      error.value = t('organization.members.errors.noActiveOrganization')
      return
    }

    organizationId.value = activeMember.data.organizationId

    // Check if user is owner
    isOwner.value = await isOrganizationOwner()

    if (!isOwner.value) {
      error.value = t('organization.members.errors.onlyOwnerCanManage')
      return
    }

    await loadMembers()
    await loadInvitations()
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('organization.members.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

// Load members
const loadMembers = async () => {
  if (!organizationId.value) return

  try {
    const result = await listMembers(organizationId.value)
    // Handle both array response and object response with members property
    if (Array.isArray(result.data)) {
      members.value = result.data as OrganizationMemberWithUser[]
    } else if (result.data?.members) {
      members.value = result.data.members as OrganizationMemberWithUser[]
    } else {
      members.value = []
    }
  } catch (err) {
    console.error('Failed to load members:', err)
    members.value = []
  }
}

// Load invitations
const loadInvitations = async () => {
  if (!organizationId.value) return

  try {
    const result = await listInvitations(organizationId.value)
    if (result.data) {
      invitations.value = Array.isArray(result.data) ? result.data : []
    } else {
      invitations.value = []
    }
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
  if (!organizationId.value || !selectedInvitation.value) return

  try {
    const result = await resendInvitation(selectedInvitation.value.id, organizationId.value, selectedInvitation.value.email, selectedInvitation.value.role as any)
    if (result.error) {
      throw new Error(result.error.message || t('organization.members.errors.resendFailed'))
    }
    await loadInvitations()
    toast.add({
      title: t('common.success'),
      description: t('organization.members.invitations.resendSuccess'),
      color: 'success'
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('organization.members.errors.resendFailed')
    toast.add({
      title: t('common.error'),
      description: apiError.message || t('organization.members.errors.resendFailed'),
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
  if (!organizationId.value || !deleteInvitationId.value) return

  try {
    const result = await cancelInvitation(deleteInvitationId.value)
    if (result.error) {
      throw new Error(result.error.message || t('organization.members.errors.cancelFailed'))
    }
    await loadInvitations()
    toast.add({
      title: t('common.success'),
      description: t('organization.members.invitations.deleteSuccess'),
      color: 'success'
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('organization.members.errors.cancelFailed')
    toast.add({
      title: t('common.error'),
      description: apiError.message || t('organization.members.errors.cancelFailed'),
      color: 'error'
    })
  } finally {
    deleteInvitationId.value = null
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ t('organization.members.loading') }}
        </p>
      </div>

      <!-- Error State -->
      <UAlert v-else-if="error" color="error" variant="soft" :title="error" />

      <!-- Organization Management -->
      <div v-else class="space-y-6">
        <!-- Members Card -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">{{ t('organization.members.title') }} ({{ members.length }})</h2>
          </template>
          <div v-if="members.length === 0" class="text-center py-4 text-gray-600 dark:text-gray-400">
            {{ t('organization.members.empty') }}
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('organization.members.email') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('organization.members.name') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('organization.members.role') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="member in members" :key="member.id">
                  <td class="px-4 py-3 text-sm">{{ member.user.email }}</td>
                  <td class="px-4 py-3 text-sm">{{ member.user.name || t('admin.table.notAvailable') }}</td>
                  <td class="px-4 py-3 text-sm">
                        <UBadge :color="member.role === 'owner' ? 'primary' : member.role === 'admin' ? 'info' : 'neutral'">
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
              <h2 class="text-xl font-semibold">{{ t('organization.members.invitations.title') }} ({{ invitations.length }})</h2>
              <UButton
                icon="i-lucide-user-plus"
                color="primary"
                @click="showInviteModal = true"
                class="w-full sm:w-auto"
              >
                {{ t('organization.members.invitations.inviteButton') }}
              </UButton>
            </div>
          </template>
          <div v-if="invitations.length === 0" class="text-center py-4 text-gray-600 dark:text-gray-400">
            {{ t('organization.members.invitations.empty') }}
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('organization.members.email') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('organization.members.role') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('organization.members.invitations.status') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('organization.members.invitations.expires') }}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ t('organization.members.invitations.actions') }}</th>
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
                        {{ t('organization.members.invitations.resend') }}
                      </UButton>
                      <UButton
                        icon="i-lucide-trash-2"
                        variant="ghost"
                        size="sm"
                        color="error"
                        @click="openDeleteModal(invitation.id)"
                      >
                        {{ t('organization.members.invitations.delete') }}
                      </UButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>

      <!-- Invite Member Modal -->
      <OrganizationInviteMemberModal
        v-if="showInviteModal && organizationId"
        v-model:open="showInviteModal"
        :organization-id="organizationId"
        @success="handleInviteSuccess"
      />

      <!-- Resend Invitation Confirmation Modal -->
      <ConfirmationModal
        v-if="showResendModal && selectedInvitation"
        v-model:open="showResendModal"
        title="organization.members.invitations.confirmResend.title"
        message="organization.members.invitations.confirmResend.message"
        :message-params="{ email: selectedInvitation.email, role: selectedInvitation.role }"
        confirm-text="organization.members.invitations.confirmResend.confirm"
        confirm-color="primary"
        @confirm="handleResendInvitation"
      />

      <!-- Delete Invitation Confirmation Modal -->
      <ConfirmationModal
        v-if="showDeleteModal"
        v-model:open="showDeleteModal"
        title="organization.members.invitations.confirmDelete.title"
        message="organization.members.invitations.confirmDelete.message"
        confirm-text="organization.members.invitations.confirmDelete.confirm"
        confirm-color="error"
        @confirm="handleDeleteInvitation"
      />
    </UContainer>
  </div>
</template>

