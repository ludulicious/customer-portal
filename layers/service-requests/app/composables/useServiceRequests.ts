import { authClient } from '~~/lib/auth-client'

export const useServiceRequests = () => {
  const requests = ref<ServiceRequestWithRelations[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({ total: 0, page: 1, limit: 20, pages: 0 })

  const fetchRequests = async (filters?: ServiceRequestFilters) => {
    loading.value = true
    error.value = null

    try {
      // Get current organization using better-auth
      const { data: member } = await authClient.organization.getActiveMember()
      const organizationId = member?.organizationId

      if (!organizationId) {
        throw new Error('No organization found')
      }

      const response = await $fetch('/api/service-requests', {
        query: { ...filters, organizationId }
      })
      requests.value = response.requests
      pagination.value = response.pagination
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching service requests:', e)
    } finally {
      loading.value = false
    }
  }

  const createRequest = async (data: ServiceRequestCreateInput) => {
    loading.value = true
    error.value = null

    try {
      const newRequest = await $fetch('/api/service-requests', {
        method: 'POST',
        body: data
      })
      requests.value.unshift(newRequest)
      return newRequest
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateRequest = async (
    id: string,
    data: ServiceRequestUpdateInput
  ) => {
    loading.value = true
    error.value = null

    try {
      const updated = await $fetch(`/api/service-requests/${id}`, {
        method: 'PATCH' as const,
        body: data
      })
      const index = requests.value.findIndex(r => r.id === id)
      if (index !== -1) {
        requests.value[index] = updated
      }
      return updated
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteRequest = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/service-requests/${id}`, {
        method: 'DELETE' as const
      })
      requests.value = requests.value.filter(r => r.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const getRequest = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      return await $fetch(`/api/service-requests/${id}`)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    requests: readonly(requests),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),
    fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    getRequest
  }
}
