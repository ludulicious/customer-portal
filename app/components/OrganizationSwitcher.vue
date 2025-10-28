<template>
  <div class="organization-switcher">
    <div v-if="loading" class="loading">Loading organizations...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="switcher">
      <label for="org-select">Organization:</label>
      <select
        id="org-select"
        v-model="selectedOrg"
        @change="switchOrganization"
        class="org-select"
      >
        <option value="">Select Organization</option>
        <option v-for="org in organizations" :key="org.id" :value="org.id">
          {{ org.name }}
        </option>
      </select>
      <button @click="createNewOrg" class="create-btn">
        Create New Organization
      </button>
    </div>
  </div>
</template>

<script setup>
import { authClient } from '~/lib/auth-client'

const organizations = ref([])
const selectedOrg = ref('')
const loading = ref(true)
const error = ref('')

const loadOrganizations = async () => {
  try {
    loading.value = true
    const { data, error: orgError } = await authClient.organization.list()
    if (orgError) throw orgError
    organizations.value = data || []
  } catch (err) {
    error.value = err.message || 'Failed to load organizations'
  } finally {
    loading.value = false
  }
}

const switchOrganization = async (event) => {
  const orgId = event.target.value
  if (!orgId) return

  try {
    await authClient.organization.switch({ organizationId: orgId })
    // Refresh the page or emit event to update parent components
    await navigateTo('/dashboard')
  } catch (err) {
    error.value = err.message || 'Failed to switch organization'
  }
}

const createNewOrg = () => {
  // Navigate to organization creation page or show modal
  navigateTo('/organizations/create')
}

onMounted(() => {
  loadOrganizations()
})
</script>

<style scoped>
.organization-switcher {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
}

.org-select {
  margin: 0 0.5rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
}

.create-btn {
  padding: 0.25rem 0.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.create-btn:hover {
  background: #2563eb;
}
</style>

