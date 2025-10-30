import { authClient } from '~~/lib/auth-client'

export const useServiceRequestWidget = () => {
  const { requests, loading, fetchRequests } = useServiceRequests()

  const initializeWidget = async () => {
    try {
      const { data: member } = await authClient.organization.getActiveMember()
      if (member?.organizationId) {
        await fetchRequests({ limit: 5 })
      }
    } catch (error) {
      console.error('Failed to check organization membership:', error)
    }
  }

  return {
    requests: readonly(requests),
    loading: readonly(loading),
    initializeWidget
  }
}
