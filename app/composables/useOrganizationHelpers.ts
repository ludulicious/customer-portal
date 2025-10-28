import { authClient } from '~~/lib/auth-client'

export const useOrganizationHelpers = () => {
  // Get current user's organization
  const getCurrentOrganization = async () => {
    const { data: member } = await authClient.organization.getActiveMember()
    return member?.organizationId
  }

  // Check if user is organization owner
  const isOrganizationOwner = async () => {
    const { data: roleData } = await authClient.organization.getActiveMemberRole()
    return roleData?.role === 'owner'
  }

  // Check if user is organization admin
  const isOrganizationAdmin = async () => {
    const { data: roleData } = await authClient.organization.getActiveMemberRole()
    return roleData?.role === 'admin' || roleData?.role === 'owner'
  }

  // List all user organizations
  const getUserOrganizations = async () => {
    const { data } = await authClient.organization.list()
    return data
  }

  return {
    getCurrentOrganization,
    isOrganizationOwner,
    isOrganizationAdmin,
    getUserOrganizations
  }
}
