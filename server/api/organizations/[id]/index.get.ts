import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { organization as organizationTable } from '~~/server/db/schema/auth-schema'
import { eq } from 'drizzle-orm'
import type { Organization, ApiError } from '~~/shared/types'

export default defineEventHandler(async (event): Promise<Organization> => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const organizationId = getRouterParam(event, 'id')
  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'Organization ID is required' })
  }

  // Verify user has access to this organization
  try {
    const result = await auth.api.listMembers({
      query: { organizationId }
    }) as unknown as { members: Array<{ userId: string }> }

    const hasAccess = result.members.some((m: { userId: string }) => m.userId === session.user.id)
    if (!hasAccess) {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }
  } catch (err) {
    const error = err as ApiError
    if (error.statusCode === 403) throw err
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Get organization details
  const [organization] = await db
    .select()
    .from(organizationTable)
    .where(eq(organizationTable.id, organizationId))
    .limit(1)

  if (!organization) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  return organization as Organization
})
