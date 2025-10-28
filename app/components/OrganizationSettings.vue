<template>
  <div class="organization-settings">
    <h2>Organization Settings</h2>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="settings-form">
      <form @submit.prevent="updateOrganization">
        <div class="form-group">
          <label for="org-name">Organization Name:</label>
          <input
            id="org-name"
            v-model="formData.name"
            type="text"
            required
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="org-slug">Organization Slug:</label>
          <input
            id="org-slug"
            v-model="formData.slug"
            type="text"
            required
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="org-logo">Logo URL:</label>
          <input
            id="org-logo"
            v-model="formData.logo"
            type="url"
            class="form-input"
          />
        </div>

        <div class="form-actions">
          <button type="submit" :disabled="updating" class="btn-primary">
            {{ updating ? 'Updating...' : 'Update Organization' }}
          </button>
          <button type="button" @click="deleteOrganization" class="btn-danger">
            Delete Organization
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authClient } from '~/lib/auth-client'

const loading = ref(true)
const updating = ref(false)
const error = ref('')
const formData = ref({
  id: '',
  name: '',
  slug: '',
  logo: ''
})

const loadOrganization = async () => {
  try {
    loading.value = true
    const { data: member } = await authClient.organization.getActiveMember()
    if (member?.organization) {
      formData.value = {
        id: member.organization.id,
        name: member.organization.name,
        slug: member.organization.slug,
        logo: member.organization.logo || ''
      }
    }
  } catch (err) {
    error.value = err.message || 'Failed to load organization'
  } finally {
    loading.value = false
  }
}

const updateOrganization = async () => {
  try {
    updating.value = true
    await authClient.organization.update({
      organizationId: formData.value.id,
      data: formData.value
    })
    // Show success message
  } catch (err) {
    error.value = err.message || 'Failed to update organization'
  } finally {
    updating.value = false
  }
}

const deleteOrganization = async () => {
  if (!confirm('Are you sure you want to delete this organization?')) return

  try {
    await authClient.organization.delete({
      organizationId: formData.value.id
    })
    // Redirect to organization list or create new
    await navigateTo('/organizations')
  } catch (err) {
    error.value = err.message || 'Failed to delete organization'
  }
}

onMounted(() => {
  loadOrganization()
})
</script>

<style scoped>
.organization-settings {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #3b82f6;
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

