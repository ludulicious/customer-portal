import { defineEventHandler, createError } from 'h3'
import { auth } from '@@/lib/auth'
import { statement, user, admin } from '@@/lib/auth/permissions'
import { prisma } from '@@/lib/db'

type SessionUser = {
  id: string
  name: string | null
  email: string
  emailVerified: boolean | null
  image: string | null
  createdAt: Date
  updatedAt: Date
  role: string | null
  banned: boolean | null
  banReason: string | null
  banExpires: Date | null
}

type SubjectType = keyof typeof statement

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Get user's role from the database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  const userRole = dbUser?.role || 'user'
  const roleDefinition = userRole === 'admin' ? admin : user

  // Get all permissions for the user
  const permissions: Record<string, boolean> = {}

  // Check each subject and permission combination
  for (const [subject, actions] of Object.entries(statement)) {
    if (Array.isArray(actions)) {
      for (const action of actions) {
        // Check if the role has this permission by looking at its statements
        const rolePermissions = roleDefinition.statements[subject as 'questionnaire' | 'questionnaire-response'] || []
        permissions[`${subject}.${action}`] = rolePermissions.includes(action)
      }
    }
  }

  return {
    permissions,
    role: userRole
  }
})
