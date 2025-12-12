import { auth } from '~~/server/utils/auth'
import { filterServiceRequestSchema } from '../../utils/service-request-validation'
import { buildRequestQuery, verifyServiceRequestAccess } from '../../utils/service-request-helpers'
import { db } from '~~/server/utils/db'
import { and, desc, eq, asc } from 'drizzle-orm'
import { serviceRequest } from '~~/server/db/schema/service-requests'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const filters = filterServiceRequestSchema.parse(query)

  // Get user's active organization from session
  type SessionWithOrg = { session?: { activeOrganizationId?: string }, activeOrganizationId?: string }
  const sessionWithOrg = session as SessionWithOrg
  const organizationId = sessionWithOrg?.session?.activeOrganizationId || sessionWithOrg?.activeOrganizationId

  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'No organization found' })
  }

  // Verify user has permission to list service requests
  const hasAccess = await verifyServiceRequestAccess(session, organizationId, 'list')
  if (!hasAccess) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const where = and(eq(serviceRequest.organizationId, organizationId), buildRequestQuery(filters))

  const totalCount = await db.$count(serviceRequest, where)

  if (totalCount === 0) {
    return {
      items: [],
      totalCount
    }
  }

  const items = await db
    .select()
    .from(serviceRequest)
    .where(where)
    .orderBy(desc(serviceRequest.createdAt), asc(serviceRequest.id))
    .offset(filters.skip)
    .limit(filters.take)

  return {
    items,
    totalCount
  }
})
