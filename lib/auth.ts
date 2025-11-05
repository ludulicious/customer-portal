import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { sendEmail } from './email'
import { admin, customSession, emailOTP, organization } from 'better-auth/plugins'
import { db } from './db'
import { eq, sql } from 'drizzle-orm'
import { user as userTable, account as accountTable, session as sessionTable, verification as verificationTable, organization as organizationTable, member as organizationMemberTable, invitation as organizationInvitationTable } from '../db/schema/auth-schema'
import { ac, user, admin as adminRole } from './auth/permissions'

const adminEmails = process.env.ADMIN_EMAILS?.split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean) ?? []

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: userTable,
      account: accountTable,
      session: sessionTable,
      verification: verificationTable,
      organization: organizationTable,
      organizationMember: organizationMemberTable,
      organizationInvitation: organizationInvitationTable,
    },
    usePlural: false,
    // Tables are singular (e.g., "user"), so no need for usePlural
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
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
        after: async (user) => {
          // Type assertion for user object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const createdUser = user as any as { id: string, email: string, name: string }

          // Existing admin role assignment
          if (createdUser.email && adminEmails.includes(createdUser.email.toLowerCase())) {
            await db.update(userTable).set({ role: 'admin' }).where(eq(userTable.id, createdUser.id))
          }

          // Auto-create organization directly in database
          const orgName = createdUser.name || createdUser.email?.split('@')[0]
          if (!orgName) {
            console.error('Cannot create organization: no name or email available')
            return
          }

          const orgSlug = `${orgName.toLowerCase().replace(/\s+/g, '-')}-${createdUser.id.slice(0, 8)}`

          try {
            // Create organization (database will generate the ID using gen_random_uuid())
            const [organization] = await db
              .insert(organizationTable)
              .values({
                id: sql`gen_random_uuid()`,
                name: `${orgName}'s Organization`,
                slug: orgSlug,
                createdAt: new Date()
              })
              .returning()

            if (organization) {
              // Create member with owner role (database will generate the ID using gen_random_uuid())
              await db
                .insert(organizationMemberTable)
                .values({
                  id: sql`gen_random_uuid()`,
                  organizationId: organization.id,
                  userId: createdUser.id,
                  role: 'owner',
                  createdAt: new Date()
                })

              console.log(`Auto-created organization ${organization.name} for user ${createdUser.email}`)
            }
          } catch (error) {
            console.error(`Failed to auto-create organization for user ${createdUser.email}:`, error)
          }
        }
      }
    },
    session: {
      create: {
        after: async (session: { userId: string }) => {
          const [u] = await db
            .select({ email: userTable.email, role: userTable.role })
            .from(userTable)
            .where(eq(userTable.id, session.userId))
            .limit(1)
          const user = u

          if (user?.email && adminEmails.includes(user.email.toLowerCase()) && user.role !== 'admin') {
            await db.update(userTable).set({ role: 'admin' }).where(eq(userTable.id, session.userId))
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
      const [account] = await db
        .select({ providerId: accountTable.providerId })
        .from(accountTable)
        .where(eq(accountTable.userId, user.id))
        .limit(1)

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
