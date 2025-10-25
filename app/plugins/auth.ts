import { authClient } from '../../lib/auth-client'
import { useUserStore } from '~/stores/user'


export default defineNuxtPlugin({
  name: 'auth',
  async setup() {
    const userStore = useUserStore()

    // Only run on client side
    if (import.meta.server) {
      console.log('Auth plugin: Running on server, skipping session initialization')
      return
    }

    console.log('Auth plugin: Running on client, initializing session...')

    // Try a different approach - use getSession instead of useSession
    try {
      console.log('Trying getSession...')
      const sessionData = await authClient.getSession()
      console.log('getSession result:', sessionData)

      if (sessionData?.data?.user) {
        console.log('Found user via getSession:', sessionData.data.user)
        userStore.setUser(sessionData.data.user)
        await userStore.fetchUserPermissions()
      }
    } catch (error) {
      console.log('getSession error:', error)
    }

    // Also set up the reactive session watcher
    const { data: session } = await authClient.useSession(useFetch)
    console.log('session in auth plugin', session)
    console.log('session.value?.user?', session.value?.user)

    // Watch for session changes
    watch(() => session.value?.user, async (newUser) => {
      console.log('Session user changed:', newUser)
      userStore.setUser(newUser) // Set the user in the store
      if (newUser) {
        // User is logged in, fetch permissions
        await userStore.fetchUserPermissions()
      } else {
        // User is logged out, clear store
        userStore.clearUserData()
      }
    }, { immediate: true })
  }
})
