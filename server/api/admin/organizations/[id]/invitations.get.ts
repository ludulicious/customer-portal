import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { invitation as invitationTable } from '~~/server/db/schema/auth-schema'
import { eq, and } from 'drizzle-orm'
import type { SessionUser, OrganizationInvitationsResponse } from '~~/shared/types'

export default defineEventHandler(async (event): Promise<OrganizationInvitationsResponse> => {
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
  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'Organization ID is required' })
  }

  // Get all pending invitations for this organization
  const invitations = await db
    .select()
    .from(invitationTable)
    .where(
      and(
        eq(invitationTable.organizationId, organizationId),
        eq(invitationTable.status, 'pending')
      )
    )
    .orderBy(invitationTable.expiresAt)

  return invitations as OrganizationInvitationsResponse
})


