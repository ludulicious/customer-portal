import { authClient } from '~/lib/auth-client'

// No longer needed: const publicPaths = ['/', '/sign-up', '/login']

export default defineNuxtRouteMiddleware(async (to) => {
  // Check if the target route has the 'public' metadata flag set to true
  if (to.meta.public === true) {
    // If it's public, allow navigation without checking auth
    return
  }

  // If the route is not marked as public, proceed with authentication check
  const { data: session } = await authClient.useSession(useFetch)

  if (!session.value) {
    // No active session, redirect the user to the login page
    // Preserve the original intended path via a redirect query parameter
    const redirectPath = `/login?redirect=${encodeURIComponent(to.fullPath)}`
    return navigateTo(redirectPath, {
      external: false,
      replace: true, // Use replace to avoid adding the original protected path to history
    })
  }

  // User is authenticated, allow access to the protected route
})
