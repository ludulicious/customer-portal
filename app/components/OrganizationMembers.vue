<template>
  <div class="organization-members">
    <div class="members-header">
      <h3>Organization Members</h3>
      <button @click="showInviteModal = true" class="btn-primary">
        Invite Member
      </button>
    </div>

    <div v-if="loading" class="loading">Loading members...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="members-list">
      <div v-for="member in members" :key="member.id" class="member-card">
        <div class="member-info">
          <div class="member-name">{{ member.user.name || member.user.email }}</div>
          <div class="member-email">{{ member.user.email }}</div>
          <div class="member-role">{{ member.role.join(', ') }}</div>
        </div>
        <div class="member-actions">
          <button @click="updateMemberRole(member)" class="btn-secondary">
            Update Role
          </button>
          <button @click="removeMember(member)" class="btn-danger">
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- Invite Modal -->
    <div v-if="showInviteModal" class="modal-overlay" @click="showInviteModal = false">
      <div class="modal" @click.stop>
        <h3>Invite Member</h3>
        <form @submit.prevent="inviteMember">
          <div class="form-group">
            <label for="invite-email">Email:</label>
            <input
              id="invite-email"
              v-model="inviteEmail"
              type="email"
              required
              class="form-input"
            />
          </div>
          <div class="form-actions">
            <button type="submit" :disabled="inviting" class="btn-primary">
              {{ inviting ? 'Sending...' : 'Send Invitation' }}
            </button>
            <button type="button" @click="showInviteModal = false" class="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { authClient } from '~/lib/auth-client'
import { useCurrentOrganization } from '~/composables/useCurrentOrganization'

const { organizationId } = useCurrentOrganization()

const members = ref([])
const loading = ref(true)
const error = ref('')
const showInviteModal = ref(false)
const inviteEmail = ref('')
const inviting = ref(false)

const loadMembers = async () => {
  try {
    loading.value = true
    const { data, error: membersError } = await authClient.organization.listMembers({
      query: { organizationId: organizationId.value }
    })
    if (membersError) throw membersError
    members.value = data || []
  } catch (err) {
    error.value = err.message || 'Failed to load members'
  } finally {
    loading.value = false
  }
}

const inviteMember = async () => {
  try {
    inviting.value = true
    await authClient.organization.inviteMember({
      email: inviteEmail.value,
      organizationId: organizationId.value
    })
    showInviteModal.value = false
    inviteEmail.value = ''
    // Show success message
  } catch (err) {
    error.value = err.message || 'Failed to send invitation'
  } finally {
    inviting.value = false
  }
}

const updateMemberRole = async (member) => {
  // Implement role update logic
}

const removeMember = async (member) => {
  if (!confirm(`Remove ${member.user.email} from organization?`)) return

  try {
    await authClient.organization.removeMember({
      memberIdOrEmail: member.user.email,
      organizationId: organizationId.value
    })
    await loadMembers()
  } catch (err) {
    error.value = err.message || 'Failed to remove member'
  }
}

onMounted(() => {
  loadMembers()
})
</script>

<style scoped>
.organization-members {
  padding: 1rem;
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.member-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.member-info {
  flex: 1;
}

.member-name {
  font-weight: 500;
}

.member-email {
  color: #6b7280;
  font-size: 0.875rem;
}

.member-role {
  color: #3b82f6;
  font-size: 0.875rem;
}

.member-actions {
  display: flex;
  gap: 0.5rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  min-width: 400px;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}
</style>


