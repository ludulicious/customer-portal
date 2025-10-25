import { authClient } from '../../lib/auth-client'
import { useUserStore } from '~/stores/user'


export default defineNuxtPlugin(async () => {
  const userStore = useUserStore()

  // Initialize session watcher
  const session = await authClient.useSession(useFetch)
  console.log('session in auth plugin', session)
  console.log('session.data.value?.user?', session.data.value?.user)
  // Watch for session changes
  watch(() => session.data.value?.user, async (newUser) => {
    userStore.setUser(newUser) // Set the user in the store
    if (newUser) {
      // User is logged in, fetch permissions
      await userStore.fetchUserPermissions()
    } else {
      // User is logged out, clear store
      userStore.clearUserData()
    }
  }, { immediate: true })
})
