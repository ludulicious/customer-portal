import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '@@/lib/auth'
import { db } from '@@/lib/db'
import { invitation as invitationTable } from '@@/db/schema/auth-schema'
import { eq, and } from 'drizzle-orm'
import type { OrganizationMemberWithUser, OrganizationInvitationsResponse, ApiError } from '~~/types'

export default defineEventHandler(async (event): Promise<OrganizationInvitationsResponse> => {
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
    }) as unknown as { members?: OrganizationMemberWithUser[] } | OrganizationMemberWithUser[]

    // Handle both array and object response
    const members = Array.isArray(result) ? result : result.members || []

    // Check if current user is in the members list
    const hasAccess = members.some(m => m.userId === session.user.id)
    if (!hasAccess) {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }
  } catch (err) {
    const error = err as ApiError
    if (error.statusCode === 403) throw err
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
