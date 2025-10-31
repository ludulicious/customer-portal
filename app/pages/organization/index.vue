<script setup lang="ts">
const route = useRoute()
const { organizationId, fetchCurrentOrganization } = useCurrentOrganization()
const { isOrganizationAdmin } = useOrganizationHelpers()

const showInviteModal = ref(false)
const isAdmin = ref(false)

onMounted(async () => {
  await fetchCurrentOrganization()
  isAdmin.value = await isOrganizationAdmin()
  
  // Show invite modal if query param is set
  if (route.query.invite === 'true') {
    showInviteModal.value = true
  }
})

// Check if user is admin
watch(organizationId, async () => {
  if (organizationId.value) {
    isAdmin.value = await isOrganizationAdmin()
  }
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Organization Management
          </h1>
          <UButton
            v-if="isAdmin"
            @click="showInviteModal = true"
            icon="i-lucide-user-plus"
            color="primary"
          >
            Invite Member
          </UButton>
        </div>

        <!-- Organization Settings -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Settings</h2>
          </template>
          <OrganizationSettings />
        </UCard>

        <!-- Organization Members -->
        <UCard v-if="isAdmin">
          <template #header>
            <h2 class="text-xl font-semibold">Members & Invitations</h2>
          </template>
          <OrganizationMembers :show-invite-modal="showInviteModal" @close-invite-modal="showInviteModal = false" />
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

