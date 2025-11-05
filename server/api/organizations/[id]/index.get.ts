import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '@@/lib/auth'
import { db } from '@@/lib/db'
import { organization as organizationTable } from '@@/db/schema/auth-schema'
import { eq } from 'drizzle-orm'
import type { Organization, ApiError } from '~~/types'

export default defineEventHandler<Organization>(async (event) => {
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
    }) as Array<{ userId: string }>
    
    const hasAccess = result.some((m) => m.userId === session.user.id)
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

  return organization
})

