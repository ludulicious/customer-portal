import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '~~/server/utils/auth'
import type { OrganizationMemberWithUser, ApiError } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const organizationId = getRouterParam(event, 'id')
  const invitationId = getRouterParam(event, 'invitationId')

  if (!organizationId || !invitationId) {
    throw createError({ statusCode: 400, message: 'Organization ID and Invitation ID are required' })
  }

  // Verify user has access to this organization and is owner/admin
  try {
    const result = await auth.api.listMembers({
      query: { organizationId }
    }) as unknown as { members?: OrganizationMemberWithUser[] } | OrganizationMemberWithUser[]

    const members = Array.isArray(result) ? result : result.members || []
    const userMember = members.find(m => m.userId === session.user.id)

    if (!userMember) {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }

    // Check if user is owner or admin
    const role = Array.isArray(userMember.role) ? userMember.role[0] : userMember.role
    if (role !== 'owner' && role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Only owners and admins can manage invitations' })
    }
  } catch (err) {
    const error = err as ApiError
    if (error.statusCode === 403) throw err
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Cancel invitation using Better Auth API
  const result = await auth.api.cancelInvitation({
    body: {
      invitationId
    }
  })

  return result
})


