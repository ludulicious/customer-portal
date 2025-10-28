import { createAuthClient } from 'better-auth/vue' // Use the Vue-specific import
import { adminClient, emailOTPClient, organizationClient } from 'better-auth/client/plugins'
import { ac, user, admin as adminRole } from './auth/permissions'

const baseURL = process.env.BETTER_AUTH_URL

export const authClient = createAuthClient({
  baseURL: baseURL,
  plugins: [
    adminClient({
      ac,
      roles: {
        user,
        admin: adminRole
      }
    }),
    emailOTPClient(),
    organizationClient() // Add organization client
  ],
})


export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
  emailOtp,
  sendVerificationEmail,
} = authClient

