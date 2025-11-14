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
  const permissions = ref<UserPermissions>({})
  const role = ref<string | null>(null)
  const isLoading = ref(false)
  const currentOrganization = ref<OrganizationMemberWithUser | null>(null)

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
    const parts = name.split(' ')
    if (parts[0]) {
      return parts[0].charAt(0).toUpperCase()
    } else if (parts.length > 1) {
      return (
        parts[0]?.charAt(0) || '?' + (parts[parts.length - 1]?.charAt(0) || '?')
      ).toUpperCase()
    }
    return ''
  })

  const activeOrganizationId = computed(() => {
    return currentSession.value?.activeOrganizationId
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
  }

  const setActiveOrganizationId = async (organizationId: string) => {
    try {
      const { data, error } = await authClient.organization.setActive({ organizationId })
      if (error) {
        console.error('Error setting active organization:', error)
      }
      if (data) {
        console.log('Active organization set:', data)
        const session = await authClient.getSession() as unknown as AuthSessionResponse
        setSession(session)
      }
    } catch (error) {
      console.error('Error setting active organization:', error)
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
    currentOrganization,
    activeOrganizationId,
    fetchUserPermissions,
    hasPermission,
    clearUserData,
    setSession,
    setActiveOrganizationId,
    setCurrentUser
  }
})
