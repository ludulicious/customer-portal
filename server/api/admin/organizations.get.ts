import { defineEventHandler, createError } from 'h3'
import { auth } from '@@/lib/auth'
import { db } from '@@/lib/db'
import { organization as organizationTable } from '@@/db/schema/auth-schema'
import type { SessionUser, AdminOrganizationsResponse } from '~~/types'

export default defineEventHandler<AdminOrganizationsResponse>(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check if user is admin
  const user = session.user as SessionUser
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Get all organizations with member counts
  const organizations = await db
    .select()
    .from(organizationTable)
    .orderBy(organizationTable.createdAt)

  return organizations
})

