<script setup lang="ts">
import type { OrganizationInvitationsResponse, OrganizationMemberWithUser, ApiError } from '#types'
import { useOrganization } from '~/composables/useOrganization'

definePageMeta({
  layout: 'default'
})

const { t } = useI18n()
const { getActiveMember, listMembers, inviteMember, isOrganizationOwner, listInvitations, resendInvitation, cancelInvitation } = useOrganization()

const loading = ref(true)
const error = ref('')
const organizationId = ref<string | null>(null)
const members = ref<OrganizationMemberWithUser[]>([])
const invitations = ref<OrganizationInvitationsResponse>([])
const showInviteModal = ref(false)
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

// Resend invitation
const handleResendInvitation = async (invitationId: string, email: string, role: string) => {
  if (!organizationId.value) return

  try {
    const result = await resendInvitation(invitationId, organizationId.value, email, role as any)
    if (result.error) {
      throw new Error(result.error.message || t('organization.members.errors.resendFailed'))
    }
    await loadInvitations()
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('organization.members.errors.resendFailed')
  }
}

// Delete invitation
const handleDeleteInvitation = async (invitationId: string) => {
  if (!organizationId.value) return

  if (!confirm(t('organization.members.confirm.cancelInvitation'))) {
    return
  }

  try {
    const result = await cancelInvitation(invitationId)
    if (result.error) {
      throw new Error(result.error.message || t('organization.members.errors.cancelFailed'))
    }
    await loadInvitations()
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('organization.members.errors.cancelFailed')
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
                        @click="handleResendInvitation(invitation.id, invitation.email, invitation.role || 'member')"
                      >
                        {{ t('organization.members.invitations.resend') }}
                      </UButton>
                      <UButton
                        icon="i-lucide-trash-2"
                        variant="ghost"
                        size="sm"
                        color="error"
                        @click="handleDeleteInvitation(invitation.id)"
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
    </UContainer>
  </div>
</template>

