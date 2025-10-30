import { defineEventHandler, createError } from 'h3'
import { statement, user as userRole, admin as adminRole } from '@@/lib/auth/permissions'
import { auth } from '@@/lib/auth'

// type SubjectType = keyof typeof statement

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  type SessionUserWithRole = { role?: string }
  const currentUser = session.user as SessionUserWithRole
  // Get user's role from the database
  const currentRole = currentUser.role || 'user'
  const roleDefinition = currentRole === 'admin' ? adminRole : userRole

  // Get all permissions for the user
  const permissions: Record<string, boolean> = {}

  // Check each subject and permission combination
  for (const [subject, actions] of Object.entries(statement)) {
    if (Array.isArray(actions)) {
      for (const action of actions) {
        // Check if the role has this permission by looking at its statements
        const rolePermissions = (roleDefinition as unknown as Record<string, readonly string[]>)[subject as string] || []
        permissions[`${subject}.${action}`] = rolePermissions.includes(action)
      }
    }
  }

  return {
    permissions,
    role: currentRole
  }
})
