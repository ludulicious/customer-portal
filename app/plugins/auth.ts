import { authClient } from '~/utils/auth-client'

export default defineNuxtPlugin({
  name: 'auth',
  async setup() {
    const userStore = useUserStore()
    // const organizationStore = useOrganization()
    try {
      const sessionData = await authClient.getSession()
      console.log('Initial session data:', sessionData)

      if (sessionData?.data?.user) {
        console.log('Setting user from initial session:', sessionData.data)
        userStore.setUser(sessionData.data.user as SessionUser)
        await userStore.fetchCurrentSession()
        await userStore.fetchUserPermissions()
      } else {
        console.log('No user found in initial session')
      }
    } catch (error) {
      console.log('getSession error:', error)
    }

    const { data: session } = await authClient.useSession(useFetch)

    watch(
      () => session.value?.user,
      async (newUser) => {
        console.log('newUser', newUser)
        userStore.setUser(newUser as SessionUser)
        if (newUser) {
          await userStore.fetchCurrentSession()
          await userStore.fetchUserPermissions()
        } else {
          userStore.clearUserData()
        }
      },
      { immediate: true },
    )

    // Also watch for session changes to handle OTP verification
    watch(
      () => session.value,
      async (newSession) => {
        if (newSession?.user) {
          console.log('Session updated, user:', newSession.user)
          userStore.setUser(newSession.user as SessionUser)
          await userStore.fetchCurrentSession()
          await userStore.fetchUserPermissions()
        }
      },
      { deep: true }
    )
  },
})
