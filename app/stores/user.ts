import { defineStore } from 'pinia'

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
  const currentUser = ref<any | null>(null)
  const hasFetchedPermissions = ref(false)

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
      return null
    }
    const name = user.name || user.email || ''
    if (!name) {
      return ''
    }
    const parts = name.split(' ')
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    } else if (parts.length > 1) {
      return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      ).toUpperCase()
    }
    return ''
  })

  const loggedInUsingEmail = computed(() => {
    const user = currentUser.value
    if (!user || typeof (user as any).providerId === 'undefined') return false
    return (user as any).providerId === 'credential'
  })


  async function fetchUserPermissions() {
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
    console.log('Fetching user permissions from API for user:', currentUser.value.id)
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

  function clearUserData() {
    console.log('Clearing user data and permissions fetch status.')
    permissions.value = {}
    role.value = null
    currentUser.value = null
    hasFetchedPermissions.value = false
    // No longer need to reset lastSessionCheckTime
  }

  function setUser(user: any | null) {
    if (user) {
      if (!currentUser.value || currentUser.value.id !== user.id) {
        console.log('setUser: User changed or new user. Resetting permission status.')
        permissions.value = {}
        role.value = null
        hasFetchedPermissions.value = false
        // No longer need to reset lastSessionCheckTime
      }
      currentUser.value = user
    } else {
      console.log('setUser: Setting user to null. Clearing all user data.')
      clearUserData()
    }
  }

  const isAuthenticated = computed(() => {
    return currentUser.value !== null
  })

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
    fetchUserPermissions,
    hasPermission,
    clearUserData,
    setUser,
  }
})
