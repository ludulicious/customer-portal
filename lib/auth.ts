import { betterAuth, type Session } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { type User } from '@prisma/client'
import { sendEmail } from './email'
import { admin, customSession } from 'better-auth/plugins'
import { prisma } from './db' // Import shared Prisma client
import { ac, user, admin as adminRole } from './auth/permissions'

type VerificationEmailUser = Pick<User, 'id' | 'email'> // Using Pick for simplicity

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignInAfterVerification: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      console.log(`Requesting password reset email for ${user.email}`)
      try {
        // Call updated sendEmail with specific params
        await sendEmail({
          to: user.email,
          subject: 'Reset your Upstream Jobs password',
          params: {
            // greeting: `Hello ${user.name || ''},`, // Optional: Use user name if available
            greeting: 'Hello,',
            body_text:
              'You requested a password reset for your Apex Pro account. Please click the button below to set a new password:',
            action_url: url,
            action_text: 'Reset Password',
            footer_text:
              "If you didn't request a password reset, please ignore this email.",
          },
        })
        console.log(
          `Successfully requested password reset email sending for ${user.email}`,
        )
      } catch (error) {
        console.error(
          `Error sending password reset email to ${user.email}:`,
          error,
        )
      }
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      console.log(`Requesting verification email for ${user.email}`)
      try {
        // Call updated sendEmail with specific params
        await sendEmail({
          to: user.email,
          subject: 'Verify your Apex Pro email address',
          params: {
            // greeting: `Hello ${user.name || ''},`, // Optional: Use user name if available
            greeting: 'Hello,',
            body_text:
              'Thanks for signing up for Apex Pro! Please click the button below to verify your email address:',
            action_url: url,
            action_text: 'Verify Email',
            footer_text:
              "If you didn't sign up for Apex Pro, please ignore this email.",
          },
        })
        console.log(
          `Successfully requested verification email sending for ${user.email}`,
        )
      } catch (error) {
        console.error(
          `Error sending verification email to ${user.email}:`,
          error,
        )
      }
    },
    autoSignInAfterVerification: true,
    onVerificationError: ({
      request,
      response,
    }: {
      request: Request | undefined
      response: Response | undefined
    }) => {
      console.log('Verification failed, redirecting to /verification-error')
      return {
        redirect: {
          url: '/verification-error',
        },
      }
    },
  },
  plugins: [
    admin({
      ac,
      roles: {
        user,
        admin: adminRole
      },
      defaultRole: 'user'
    }),
    customSession(async (sessionData) => {
      // Destructure user and session from the input object
      const { user, session } = sessionData
      console.log('custom session sessionData', sessionData)
      // Fetch the account for the user
      const account = await prisma.account.findFirst({
        where: { userId: user.id },
      })

      // Return modified session data
      return {
        ...session, // Spread the original session part
        user: {
          ...user, // Spread the original user part
          providerId: account?.providerId || null, // Add providerId to user object
        },
      }
    }),
  ],
})
