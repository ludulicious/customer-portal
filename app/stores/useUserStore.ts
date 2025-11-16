import { defineStore } from 'pinia'
import type { AuthSession, AuthUser, AuthSessionResponse } from '~/utils/auth-client'
import { authClient } from '~/utils/auth-client'

interface UserPermissions {
  [key: string]: boolean
}

interface PermissionsResponse {
  permissions: UserPermissions
  role: string
}

export const useUserStore = defineStore('user', () => {
  const organizationsHelper = authClient.useListOrganizations()
  const permissions = ref<UserPermissions>({})
  const role = ref<string | null>(null)
  const isLoading = ref(false)
  const activeOrganization = computed(() => {
    return organizationsHelper.value.data?.find(org => org.id === activeOrganizationId.value)
  })

  const hasFetchedPermissions = ref(false)
  const currentSession = ref<AuthSession | null>(null)
  const currentUser = ref<AuthUser | null>(null)

  const colorMode = useColorMode() // Use the colorMode composable
  const theme = ref(colorMode.preference)

  // Watch for changes in colorMode.preference from @nuxtjs/color-mode
  watch(() => colorMode.preference, (newValue) => {
    theme.value = newValue // Update our store's theme ref
  })

  const hasPermission = (subject: string, action: string): boolean => {
    return permissions.value[`${subject}.${action}`] ?? false
  }

  const isAdmin = computed(() => role.value === 'admin')

  const userInitials = computed(() => {
    const user = currentUser.value
    if (!user) {
      return undefined
    }
    const name = user.name || user.email || ''
    if (!name) {
      return ''
    }
    const parts = name.split(' ').filter(part => part.length > 0)
    if (parts.length === 0) {
      return ''
    }
    if (parts.length === 1) {
      return parts[0]?.charAt(0).toUpperCase() || ''
    }
    // Multiple parts: return first char of first part + first char of last part
    const first = parts[0]?.charAt(0) || ''
    const last = parts[parts.length - 1]?.charAt(0) || ''
    return (first + last).toUpperCase()
  })

  const activeOrganizationId = computed(() => {
    return currentSession.value?.activeOrganizationId
  })

  // Store the active organization role
  const activeOrganizationRoleValue = ref<string | null>(null)

  // Watch for changes in activeOrganizationId and fetch the role
  watch([activeOrganizationId, currentUser], async ([newOrgId, user]) => {
    if (newOrgId && user) {
      try {
        const { data: roleData } = await authClient.organization.getActiveMemberRole()
        activeOrganizationRoleValue.value = roleData?.role || null
      } catch (error) {
        console.error('Error fetching active organization role:', error)
        activeOrganizationRoleValue.value = null
      }
    } else {
      activeOrganizationRoleValue.value = null
    }
  }, { immediate: true })

  // Computed property that returns the active organization role
  const activeOrganizationRole = computed(() => {
    return activeOrganizationRoleValue.value
  })

  const loggedInUsingEmail = computed(() => {
    const user = currentUser.value
    if (!user || typeof user.providerId === 'undefined') return false
    return user.providerId === 'credential'
  })

  const fetchUserPermissions = async () => {
    // If there is no current user, or permissions have already been fetched, do nothing.
    if (!currentUser.value || hasFetchedPermissions.value) {
      if (!currentUser.value) {
        console.log('fetchUserPermissions: No current user, skipping.')
      } else {
        console.log('fetchUserPermissions: Permissions already loaded for current user, skipping.')
      }
      return
    }

    // At this point, we have a currentUser, but no permissions fetched for them yet.
    isLoading.value = true
    // console.log('Fetching user permissions from API for user:', currentUser.value.id)
    try {
      const data = await $fetch<PermissionsResponse>('/api/auth/permissions')
      if (data) {
        permissions.value = data.permissions
        role.value = data.role
        hasFetchedPermissions.value = true
      } else {
        console.warn('Permissions API returned no data. Clearing user data as a precaution.')
        clearUserData() // Clear data if API returns nothing, as state is uncertain
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error)
      clearUserData() // Clear data on any error during permission fetching
    } finally {
      isLoading.value = false
    }
  }

  const clearUserData = () => {
    console.log('Clearing user data and permissions fetch status.')
    permissions.value = {}
    role.value = null
    hasFetchedPermissions.value = false
    currentSession.value = null
    activeOrganizationRoleValue.value = null
  }

  const setActiveOrganizationId = async (organizationId: string) => {
    try {
      const { data, error } = await authClient.organization.setActive({ organizationId })
      if (error) {
        console.error('Error setting active organization:', error)
        throw error
      }
      if (data) {
        console.log('Active organization set:', data)
        // Fetch the updated session - retry a few times if needed
        let retries = 3
        let sessionResponse = null
        while (retries > 0) {
          sessionResponse = await authClient.getSession()
          // Check if the session has been updated with the new organizationId
          const sessionData = sessionResponse?.data as unknown as AuthSessionResponse & { activeOrganizationId?: string }
          if (sessionData && sessionData.activeOrganizationId === organizationId) {
            break
          }
          await new Promise(resolve => setTimeout(resolve, 50))
          retries--
        }

        if (sessionResponse?.data) {
          const sessionData = sessionResponse.data as unknown as AuthSessionResponse
          await setSession(sessionData)
        } else {
          console.warn('Session data not available after setting active organization')
          // Still try to fetch once more
          const finalSession = await authClient.getSession()
          if (finalSession?.data) {
            await setSession(finalSession.data as unknown as AuthSessionResponse)
          }
        }
      }
    } catch (error) {
      console.error('Error setting active organization:', error)
      throw error
    }
  }

  const setSession = async (data: AuthSessionResponse | null) => {
    if (data) {
      const { user, ...session } = data
      currentSession.value = session
      currentUser.value = data.user as AuthUser

      if (currentUser.value) {
        await fetchUserPermissions()
      }
    }
  }
  const isAuthenticated = computed(() => {
    return currentUser.value !== null
  })

  const myOrganizations = computed(() => {
    return organizationsHelper.value.data as Organization[] | null | undefined
  })

  const loadingOrganization = computed(() => {
    return organizationsHelper.value.isPending ?? false
  })

  const setCurrentUser = (data: AuthUser | null) => {
    currentUser.value = data
  }
  // Fetch current session data using getSession()
  return {
    permissions,
    role,
    isAuthenticated,
    isLoading,
    currentSession,
    currentUser,
    isAdmin,
    userInitials,
    loggedInUsingEmail,
    theme,
    activeOrganizationId,
    activeOrganization,
    activeOrganizationRole,
    myOrganizations,
    loadingOrganization,
    fetchUserPermissions,
    hasPermission,
    clearUserData,
    setSession,
    setActiveOrganizationId,
    setCurrentUser
  }
})
