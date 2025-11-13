import { defineStore } from 'pinia'
import type { SessionUser } from '~~/shared/types'
import { authClient } from '~/utils/auth-client'

interface UserPermissions {
  [key: string]: boolean
}

interface PermissionsResponse {
  permissions: UserPermissions
  role: string
}

interface CurrentSessionData {
  id?: string
  token?: string
  expiresAt?: Date
  createdAt?: Date
  updatedAt?: Date
  ipAddress?: string
  userAgent?: string
  userId?: string
}

export const useUserStore = defineStore('user', () => {
  const permissions = ref<UserPermissions>({})
  const role = ref<string | null>(null)
  const isLoading = ref(false)
  const currentUser = ref<SessionUser | null>(null)
  const currentOrganization = ref<OrganizationMemberWithUser | null>(null)
  const activeOrganizationId = ref<string | null>(null)
  const hasFetchedPermissions = ref(false)
  const isSettingActiveOrganization = ref(false)

  // Current session data
  const currentSessionData = ref<CurrentSessionData | null>(null)
  const currentSessionId = ref<string | null>(null)
  const currentSessionToken = ref<string | null>(null)

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
    currentUser.value = null
    activeOrganizationId.value = null
    hasFetchedPermissions.value = false
    isSettingActiveOrganization.value = false
    currentSessionData.value = null
    currentSessionId.value = null
    currentSessionToken.value = null
    // No longer need to reset lastSessionCheckTime
  }

  const setActiveOrganizationId = async (organizationId: string) => {
    // Prevent re-entrant calls
    if (isSettingActiveOrganization.value) {
      console.log('setActiveOrganizationId: Already setting organization, skipping.')
      return
    }

    // Skip if already set to the same value
    if (activeOrganizationId.value === organizationId) {
      console.log('setActiveOrganizationId: Already set to this organization, skipping.')
      return
    }

    isSettingActiveOrganization.value = true
    try {
      activeOrganizationId.value = organizationId
      const { data, error } = await authClient.organization.setActive({ organizationId })
      if (error) {
        console.error('Error setting active organization:', error)
        // Revert on error
        activeOrganizationId.value = null
      }
      if (data) {
        console.log('Active organization set:', data)
      }
    } finally {
      isSettingActiveOrganization.value = false
    }
  }

  const setUser = async (user: SessionUser | null) => {
    if (user) {
      if (!currentUser.value || currentUser.value.id !== user.id) {
        // console.log('setUser: User changed or new user. Resetting permission status.')
        permissions.value = {}
        role.value = null
        hasFetchedPermissions.value = false
        // No longer need to reset lastSessionCheckTime
      }

      // Only set active organization if:
      // 1. User doesn't have activeOrganizationId
      // 2. We're not already in the process of setting it
      // 3. activeOrganizationId.value is not already set
      if (!user.activeOrganizationId && !isSettingActiveOrganization.value && !activeOrganizationId.value) {
        // Use async method to fetch organizations, as useListOrganizations might not have data yet
        try {
          const { data: organizations } = await authClient.organization.list()
          if (organizations && organizations.length > 0 && organizations[0]) {
            const firstOrgId = organizations[0].id
            // Only set if different from current value
            if (activeOrganizationId.value !== firstOrgId) {
              await setActiveOrganizationId(firstOrgId)
              user.activeOrganizationId = firstOrgId
            }
          } else {
            console.warn('No organizations found for user:', user.id, '- organizations may still be loading')
          }
        } catch (error) {
          console.error('Error fetching organizations for user:', user.id, error)
        }
      } else if (user.activeOrganizationId && user.activeOrganizationId !== activeOrganizationId.value) {
        // Sync activeOrganizationId from user object if it's different
        activeOrganizationId.value = user.activeOrganizationId
      }

      currentUser.value = user
    } else {
      // console.log('setUser: Setting user to null. Clearing all user data.')
      clearUserData()
    }
  }

  const isAuthenticated = computed(() => {
    return currentUser.value !== null
  })

  // Fetch current session data using getSession()
  const fetchCurrentSession = async () => {
    try {
      const sessionData = await authClient.getSession()
      // Session data is directly in data, extract session properties
      if (sessionData?.data) {
        const data = sessionData.data as Record<string, unknown>
        currentSessionData.value = {
          id: data.id as string | undefined,
          token: data.token as string | undefined,
          expiresAt: data.expiresAt as Date | undefined,
          createdAt: data.createdAt as Date | undefined,
          updatedAt: data.updatedAt as Date | undefined,
          ipAddress: data.ipAddress as string | undefined,
          userAgent: data.userAgent as string | undefined,
          userId: data.userId as string | undefined
        }
        // Update session ID and token refs
        currentSessionId.value = data.id as string | null || null
        currentSessionToken.value = data.token as string | null || null
      } else {
        currentSessionData.value = null
        currentSessionId.value = null
        currentSessionToken.value = null
      }
    } catch {
      // Silently fail - session data will be null
      currentSessionData.value = null
      currentSessionId.value = null
      currentSessionToken.value = null
    }
  }

  return {
    permissions,
    role,
    isAuthenticated,
    isLoading,
    currentUser,
    isAdmin,
    userInitials,
    loggedInUsingEmail,
    theme,
    currentOrganization,
    activeOrganizationId,
    currentSessionId,
    currentSessionToken,
    fetchUserPermissions,
    hasPermission,
    clearUserData,
    setUser,
    setActiveOrganizationId,
    fetchCurrentSession,
  }
})
