import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '@@/lib/auth'
import { db } from '@@/lib/db'
import { invitation as invitationTable, organization as organizationTable } from '@@/db/schema/auth-schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const organizationId = getRouterParam(event, 'id')
  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'Organization ID is required' })
  }

  // Verify user has access to this organization
  // Check if user is a member of this organization using better-auth API
  try {
    const result = await auth.api.listMembers({
      query: { organizationId }
    })
    
    // Check if current user is in the members list
    const hasAccess = result.some((m: any) => m.userId === session.user.id)
    if (!hasAccess) {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }
  } catch (err: any) {
    if (err.statusCode === 403) throw err
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Get all invitations for this organization
  const invitations = await db
    .select()
    .from(invitationTable)
    .where(
      and(
        eq(invitationTable.organizationId, organizationId),
        eq(invitationTable.status, 'pending')
      )
    )

  return invitations
})

