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

    // Set up reactive session watcher (client-side only)
    if (!import.meta.server) {
      const { data: session } = await authClient.useSession(useFetch)

      watch(() => session.value?.user, async (newUser) => {
        userStore.setUser(newUser)
        if (newUser) {
          await userStore.fetchUserPermissions()
        } else {
          userStore.clearUserData()
        }
      }, { immediate: true })
    }
  }
})
