import { authClient } from '../../lib/auth-client'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip middleware on server side
  if (process.server) {
    return
  }

  // Use await to ensure session data is resolved
  const { data: session } = await authClient.useSession(useFetch)

  // If user is not authenticated and trying to access a protected route
  if (!session.value?.user && to.path !== '/login') {
    console.log(
      'Auth Middleware: No session, redirecting to login from',
      to.fullPath,
    )
    // Store intended redirect path (optional)
    // const intendedPath = to.fullPath !== '/login' ? to.fullPath : '/';
    return navigateTo('/login') // Redirect to login
  }

  // If user is authenticated and tries to access login, redirect to dashboard
  if (session.value?.user && to.path === '/login') {
    console.log(
      'Auth Middleware: Session exists, redirecting from login to dashboard',
    )
    return navigateTo('/dashboard', { replace: true }) // Redirect to dashboard
  }

  // Allow navigation otherwise
  console.log('Auth Middleware: Allowing navigation to', to.fullPath)
})
