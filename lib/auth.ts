/* eslint-disable @typescript-eslint/no-explicit-any */
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { sendEmail } from './email'
import { admin, customSession, emailOTP, organization } from 'better-auth/plugins'
import { prisma } from './db' // Import shared Prisma client
import { ac, user, admin as adminRole } from './auth/permissions'

const adminEmails = process.env.ADMIN_EMAILS?.split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean) ?? []

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignInAfterVerification: true
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    }
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user: any) => {
          // Existing admin role assignment
          if (user.email && adminEmails.includes(user.email.toLowerCase())) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'admin' }
            })
          }

          // Auto-create organization using better-auth API
          const orgName = user.name || user.email.split('@')[0]
          const orgSlug = `${orgName.toLowerCase().replace(/\s+/g, '-')}-${user.id.slice(0, 8)}`

          try {
            await auth.api.createOrganization({
              body: {
                name: `${orgName}'s Organization`,
                slug: orgSlug,
                userId: user.id,
                keepCurrentActiveOrganization: false
              }
            })
            console.log(`Auto-created organization for user ${user.email}`)
          } catch (error) {
            console.error(`Failed to auto-create organization for user ${user.email}:`, error)
          }
        }
      }
    },
    session: {
      create: {
        after: async (session: any) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { email: true, role: true }
          })

          if (user?.email && adminEmails.includes(user.email.toLowerCase()) && user.role !== 'admin') {
            await prisma.user.update({
              where: { id: session.userId },
              data: { role: 'admin' }
            })
          }
        }
      }
    }
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true, // Allow all users to create organizations initially
      organizationHooks: {
        afterCreateOrganization: async ({ organization, user }) => {
          // Auto-create organization for new users
          console.log(`Created organization ${organization.name} for user ${user.email}`)
        }
      }
    }),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        const subject = type === 'email-verification'
          ? 'Verify your Apex Pro email address'
          : type === 'sign-in'
            ? 'Your Apex Pro sign-in code'
            : 'Reset your Apex Pro password'

        await sendEmail({
          to: email,
          subject,
          params: {
            greeting: 'Hello,',
            body_text: `Your verification code is: ${otp}`,
            action_url: '#', // Not used for OTP
            action_text: 'Verification Code',
            footer_text: 'This code will expire soon. If you did not request this, please ignore this email.'
          }
        })
      }
    }),
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
        where: { userId: user.id }
      })

      // Return modified session data
      return {
        ...session, // Spread the original session part
        user: {
          ...user, // Spread the original user part
          providerId: account?.providerId || null // Add providerId to user object
        }
      }
    })
  ]
})
