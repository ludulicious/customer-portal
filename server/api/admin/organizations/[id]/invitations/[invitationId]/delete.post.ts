import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { invitation as invitationTable } from '~~/server/db/schema/auth-schema'
import { eq } from 'drizzle-orm'
import type { SessionUser } from '#types'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check if user is admin
  const user = session.user as SessionUser
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const organizationId = getRouterParam(event, 'id')
  const invitationId = getRouterParam(event, 'invitationId')

  if (!organizationId || !invitationId) {
    throw createError({ statusCode: 400, message: 'Organization ID and Invitation ID are required' })
  }

  // Get invitation to verify it exists and belongs to the organization
  const [invitation] = await db
    .select()
    .from(invitationTable)
    .where(eq(invitationTable.id, invitationId))
    .limit(1)

  if (!invitation || invitation.organizationId !== organizationId) {
    throw createError({ statusCode: 404, message: 'Invitation not found' })
  }

  // Delete the invitation directly from database
  await db
    .delete(invitationTable)
    .where(eq(invitationTable.id, invitationId))

  return { success: true, message: 'Invitation cancelled successfully' }
})


