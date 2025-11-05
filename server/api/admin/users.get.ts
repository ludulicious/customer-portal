import { defineEventHandler, createError } from 'h3'
import { auth } from '@@/lib/auth'
import { db } from '@@/lib/db'
import { user as userTable } from '@@/db/schema/auth-schema'
import type { SessionUser, AdminUsersResponse } from '~~/types'

export default defineEventHandler<AdminUsersResponse>(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check if user is admin
  const user = session.user as SessionUser
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Get all users
  const users = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      emailVerified: userTable.emailVerified,
      createdAt: userTable.createdAt,
      banned: userTable.banned
    })
    .from(userTable)
    .orderBy(userTable.createdAt)

  return users
})

