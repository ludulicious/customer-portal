import { authClient } from '~~/lib/auth-client'

export const useCurrentOrganization = () => {
  const session = authClient.useSession()

  // Reactive organization data
  const currentOrganization = ref<any>(null)
  const organizationId = ref<string | null>(null)

  // Fetch current organization data
  const fetchCurrentOrganization = async () => {
    try {
      const { data: member } = await authClient.organization.getActiveMember()
      if (member) {
        currentOrganization.value = member
        organizationId.value = member.organizationId
      }
    } catch (error) {
      console.error('Failed to fetch current organization:', error)
      currentOrganization.value = null
      organizationId.value = null
    }
  }

  // Auto-fetch on mount
  onMounted(() => {
    fetchCurrentOrganization()
  })

  // Use better-auth client methods
  const createOrganization = async (data: { name: string; slug: string }) => {
    return await authClient.organization.create(data)
  }

  const getActiveMember = async () => {
    return await authClient.organization.getActiveMember()
  }

  const listMembers = async (organizationId: string) => {
    return await authClient.organization.listMembers({
      query: { organizationId }
    })
  }

  const inviteMember = async (email: string, organizationId: string, role: 'admin' | 'member' | 'owner' = 'member') => {
    return await authClient.organization.inviteMember({
      email,
      organizationId,
      role
    })
  }

  return {
    currentOrganization: readonly(currentOrganization),
    organizationId: readonly(organizationId),
    fetchCurrentOrganization,
    createOrganization,
    getActiveMember,
    listMembers,
    inviteMember
  }
}
